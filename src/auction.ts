import assert from "assert";
import { BigNumber, constants as ethersConstants, utils as ethersUtils } from "ethers";
import * as ss from "superstruct";

import { baseDomain, gauntletDeployments, signatureTypes } from "./constants";

interface AuctionConfig {
  bidWaitTimeMs: number;
  winnerPermissionTime: number;
}

export const DepositStruct = ss.object({
  recipient: ss.string(),
  tokenAddress: ss.string(),
  amount: ss.string(), // This was BigNumber in Frontend.
  destinationChainId: ss.number(), // This is ChainId Enum in Frontend.
  relayerFeePct: ss.string(), // This was BigNumber in Frontend.
  quoteTimestamp: ss.string(), // This was BigNumber in Frontend.
  message: ss.string(),
  maxCount: ss.string(), // This was BigNumber in Frontend.
  txValue: ss.string(), // This was BigNumber in Frontend.
  sourceChainId: ss.number(), // This is ChainId Enum in Frontend.
});

export type DepositData = ss.Infer<typeof DepositStruct>;

export interface AuctionBroadcastData {
  auctionId: string;
  deposit: DepositData;
  bidDeadlineMs: number; // Bid deadline in ms.
  expiry: number; // Time in seconds since Unix epoch for how long winning bidder will have exclusive fill rights.
}

export const BidStruct = ss.object({
  auctionId: ss.string(),
  relayerAddress: ss.string(),
  signature: ss.string(),
});

export type BidData = ss.Infer<typeof BidStruct>;

export interface BidBroadcastData {
  auctionId: string;
  relayerAddress: string;
  bidTimeMs: number; // Bid submission time in ms.
}

export interface AuctionCompleteBroadcastData {
  auctionId: string;
  winningRelayer?: string; // Not set when falling back to non-exclusive relay filling.
}

interface AuctionData {
  deposit: DepositData;
  expiry: number; // Time in seconds since Unix epoch for how long winning bidder will have exclusive fill rights.
  bids: Map<string, BidData>;
}

export interface DepositReturnData {
  recipient: string; // Should be parsable as address by the client.
  relayerFeePct: string; // Should be parsable as BigNumber by the client.
  message: string; // Should be parsable as bytes by the client.
}

type EmitDeposit = (data: AuctionBroadcastData) => void;
type EmitBid = (data: BidBroadcastData) => void;
type EmitComplete = (data: AuctionCompleteBroadcastData) => void;

export type EventEmitter = {
  deposit: EmitDeposit;
  bid: EmitBid;
  complete: EmitComplete;
};

export class Auction {
  private bidWaitTimeMs: number;
  private winnerPermissionTime: number;
  private emitter: EventEmitter;
  private auctions: Map<string, AuctionData>;

  constructor(config: AuctionConfig, emitter: EventEmitter) {
    this.bidWaitTimeMs = config.bidWaitTimeMs;
    this.winnerPermissionTime = config.winnerPermissionTime;
    this.emitter = emitter;
    this.auctions = new Map<string, AuctionData>();
  }

  async deposit(deposit: DepositData): Promise<DepositReturnData> {
    if (!this.isValidDepositData(deposit)) throw new Error("Invalid deposit data");

    const auctionId = this.generateAuctionId(deposit);

    // Normally conflicts should not be possible as we delete concluded auctions at the end.
    if (this.auctions.has(auctionId)) throw new Error("Conflicting auction is running");

    const bidDeadlineMs = new Date().getTime() + this.bidWaitTimeMs;
    const expiry = Math.floor(bidDeadlineMs / 1000) + this.winnerPermissionTime; // In seconds since UNIX epoch.

    this.auctions.set(auctionId, { deposit, bids: new Map<string, BidData>(), expiry });

    // Announce auction to bidders.
    this.emitter.deposit({ auctionId, deposit, bidDeadlineMs, expiry });

    await this.sleep(this.bidWaitTimeMs);

    const winningBid = this.endAuction(auctionId);

    const depositReturnData = this.generateDepositReturnData(deposit, winningBid);

    // Delete the concluded auction so that no more bids can be accepted.
    this.auctions.delete(auctionId);

    return depositReturnData;
  }

  async bid(bid: BidData): Promise<void> {
    const bidTimeMs = new Date().getTime();

    if (!this.isValidBidData(bid)) throw new Error("Invalid bid data"); // Also checks if auction exists (is open).

    const auction = this.auctions.get(bid.auctionId);
    assert(auction !== undefined); // Only for accessing bids below as validation checked the auction is open.
    auction.bids.set(bid.relayerAddress, bid); // We allow relayer to change their bids.

    // Announce the bid.
    this.emitter.bid({ auctionId: bid.auctionId, relayerAddress: bid.relayerAddress, bidTimeMs });
  }

  private endAuction(auctionId: string): BidData | null {
    const auction = this.auctions.get(auctionId);
    assert(auction !== undefined, "Non-existing auction");

    const winningBid = this.getRandomBid(auction.bids);
    const winningRelayer = winningBid !== null ? winningBid.relayerAddress : undefined;

    this.emitter.complete({ auctionId, winningRelayer });

    return winningBid;
  }

  private getRandomBid(bids: Map<string, BidData>): BidData | null {
    if (bids.size === 0) return null; // Caller has to handle this.

    const keysArray = Array.from(bids.keys());
    const randomIndex = Math.floor(Math.random() * keysArray.length);
    const randomBidder = keysArray[randomIndex];
    const randomBid = bids.get(randomBidder);
    assert(randomBid !== undefined);
    return randomBid;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isValidDepositData(deposit: DepositData): boolean {
    try {
      return (
        ethersUtils.isAddress(deposit.recipient) &&
        ethersUtils.isAddress(deposit.tokenAddress) &&
        Number(deposit.sourceChainId) > 0 &&
        Number(deposit.destinationChainId) > 0 && // If this is not supported chain, will fallback to regular deposit.
        BigNumber.from(deposit.amount).gte(0) && // Lower bound for uint256
        BigNumber.from(deposit.amount).lte(ethersConstants.MaxUint256) && // Upper bound for uint256
        BigNumber.from(deposit.relayerFeePct).gte(BigNumber.from(2).pow(63).mul(-1)) && // Lower bound for int64
        BigNumber.from(deposit.relayerFeePct).lt(BigNumber.from(2).pow(63)) && // Upper bound for int64
        BigNumber.from(deposit.quoteTimestamp).gte(0) && // Lower bound for uint32
        BigNumber.from(deposit.quoteTimestamp).lt(BigNumber.from(2).pow(32)) && // Upper bound for uint32
        ethersUtils.isBytesLike(deposit.message) &&
        BigNumber.from(deposit.maxCount).gte(0) && // Lower bound for uint256
        BigNumber.from(deposit.maxCount).lte(ethersConstants.MaxUint256) && // Upper bound for uint256
        BigNumber.from(deposit.txValue).gte(0) && // Lower bound for uint256
        BigNumber.from(deposit.txValue).lte(ethersConstants.MaxUint256) // Upper bound for uint256
      );
    } catch {
      return false;
    }
  }

  private generateAuctionId(data: DepositData): string {
    const abiCoder = new ethersUtils.AbiCoder();
    const encodedData = abiCoder.encode(
      ["address", "address", "uint256", "uint256", "int64", "uint32", "bytes", "uint256", "uint256", "uint256"],
      [
        data.recipient,
        data.tokenAddress,
        data.amount,
        data.destinationChainId,
        data.relayerFeePct,
        data.quoteTimestamp,
        data.message,
        data.maxCount,
        data.txValue,
        data.sourceChainId,
      ],
    );

    const encodedBytes = ethersUtils.arrayify(encodedData);
    const hash = ethersUtils.keccak256(encodedBytes);

    return hash.substring(0, 10); // Extract the first 4 bytes (8 characters) from the hash.
  }

  private isValidBidFormat(bid: BidData): boolean {
    try {
      return (
        ethersUtils.isAddress(bid.relayerAddress) &&
        ethersUtils.isBytesLike(bid.signature) &&
        ethersUtils.arrayify(bid.signature).length === 65 &&
        this.auctions.has(bid.auctionId)
      );
    } catch {
      return false;
    }
  }

  private isValidBidData(bid: BidData): boolean {
    if (!this.isValidBidFormat(bid)) return false;

    const auction = this.auctions.get(bid.auctionId);
    if (auction === undefined) return false; // No matching auctionId.

    const domain = { ...baseDomain, chainId: auction.deposit.destinationChainId };

    const signedAuctionData = {
      id: Number(bid.auctionId),
      expiry: Number(auction.expiry), // This should have been broadcasted, so bidder should have signed this.
    };

    let signerAddress: string;
    try {
      signerAddress = ethersUtils.verifyTypedData(domain, signatureTypes, signedAuctionData, bid.signature);
    } catch {
      return false; // Failed to process signature verification.
    }
    return ethersUtils.getAddress(bid.relayerAddress) === signerAddress; // Should be signed by bidding relayer.
  }

  private generateDepositReturnData(deposit: DepositData, winningBid: BidData | null): DepositReturnData {
    const { recipient, relayerFeePct, message } = deposit;

    // Return the same inputs if there is no winner or we don't have deployment for target chain.
    if (winningBid === null || !gauntletDeployments.hasOwnProperty(deposit.destinationChainId))
      return { recipient, relayerFeePct, message };

    const newRecipient = gauntletDeployments[deposit.destinationChainId];

    const expiry = Math.floor(new Date().getTime() / 1000) + this.winnerPermissionTime; // In seconds since UNIX epoch.

    const newMessageBytes = [
      ...ethersUtils.arrayify(winningBid.auctionId), // auctionId is already 4 bytes hex string.
      ...ethersUtils.zeroPad(ethersUtils.arrayify(expiry), 4), // uint32 takes 4 bytes.
      ...ethersUtils.arrayify(recipient), // deposit data was validated to have this in address format.
      ...ethersUtils.arrayify(winningBid.signature), // Signature was checked to be 65 bytes when verifying bids.
      ...ethersUtils.arrayify(deposit.message), // Wrap original deposit message.
    ];
    const newMessage = ethersUtils.hexlify(newMessageBytes);

    return { recipient: newRecipient, relayerFeePct, message: newMessage };
  }
}
