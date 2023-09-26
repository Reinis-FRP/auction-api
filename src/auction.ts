import assert from "assert";
import { BigNumber, constants as ethersConstants, utils as ethersUtils } from "ethers";
import * as ss from "superstruct";

interface AuctionConfig {
  bidWaitTimeMs: number;
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
});

export type DepositData = ss.Infer<typeof DepositStruct>;

export interface AuctionBroadcastData {
  auctionId: string;
  deposit: DepositData;
  bidDeadline: number;
}

export const BidStruct = ss.object({
  auctionId: ss.string(),
  relayerAddress: ss.string(),
});

export type BidData = ss.Infer<typeof BidStruct>;

interface AuctionData {
  deposit: DepositData;
  bids: Map<string, BidData>;
}

type EmitDeposit = (type: "Deposit", dataType: AuctionBroadcastData) => void;

type EmitTypes = EmitDeposit; // TODO: Add EmitComplete.

export class Auction {
  private bidWaitTimeMs: number;
  private emit: EmitTypes;
  private auctions: Map<string, AuctionData>;

  constructor(config: AuctionConfig, emit: EmitTypes) {
    this.bidWaitTimeMs = config.bidWaitTimeMs;
    this.emit = emit;
    this.auctions = new Map<string, AuctionData>();
  }

  async deposit(deposit: DepositData): Promise<void> {
    if (!this.isValidDepositData(deposit)) throw new Error("Invalid deposit data");

    const auctionId = this.generateAuctionId(deposit);

    // Normally conflicts should not be possible as we delete concluded auctions at the end.
    if (this.auctions.has(auctionId)) throw new Error("Conflicting auction is running");

    this.auctions.set(auctionId, { deposit, bids: new Map<string, BidData>() });

    const bidDeadline = new Date().getTime() + this.bidWaitTimeMs;

    // Announce auction to bidders.
    this.emit("Deposit", { auctionId, deposit, bidDeadline });

    await this.sleep(this.bidWaitTimeMs);

    const winningBid = this.endAuction(auctionId); // TODO: construct return data based on this.

    // Delete the concluded auction so that no more bids can be accepted.
    this.auctions.delete(auctionId);
  }

  async bid(bid: BidData): Promise<void> {
    if (!this.isValidBidData(bid)) throw new Error("Invalid bid data"); // Also checks if auction exists (is open).

    const auction = this.auctions.get(bid.auctionId);
    assert(auction !== undefined); // Only for accessing bids below as validation checked the auction is open.
    auction.bids.set(bid.relayerAddress, bid); // We allow relayer to change their bids.
  }

  private endAuction(auctionId: string): BidData | null {
    const auction = this.auctions.get(auctionId);
    assert(auction !== undefined, "Non-existing auction");

    const winningBid = this.getRandomBid(auction.bids);
    // TODO: add EmitComplete.

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
        Number(deposit.destinationChainId) > 0 && // If this is not supported chain, will fallback to regular deposit.
        BigNumber.from(deposit.amount).gte(0) && // Lower bound for uint256
        BigNumber.from(deposit.amount).lte(ethersConstants.MaxUint256) && // Upper bound for uint256
        BigNumber.from(deposit.relayerFeePct).gte(BigNumber.from(2).pow(63).mul(-1)) && // Lower bound for int64
        BigNumber.from(deposit.relayerFeePct).lt(BigNumber.from(2).pow(63)) && // Upper bound for int64
        BigNumber.from(deposit.quoteTimestamp).gte(0) && // Lower bound for uint32
        ethersUtils.isBytesLike(deposit.message) &&
        BigNumber.from(deposit.relayerFeePct).lt(BigNumber.from(2).pow(32)) && // Upper bound for uint32
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
      ["address", "address", "uint256", "uint256", "int64", "uint32", "bytes", "uint256", "uint256"],
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
      ],
    );

    const encodedBytes = ethersUtils.arrayify(encodedData);
    const hash = ethersUtils.keccak256(encodedBytes);

    return hash.substring(0, 10); // Extract the first 4 bytes (8 characters) from the hash.
  }

  private isValidBidData(bid: BidData): boolean {
    try {
      // TODO: add signature verification.
      return ethersUtils.isAddress(bid.relayerAddress) && this.auctions.has(bid.auctionId);
    } catch {
      return false;
    }
  }
}
