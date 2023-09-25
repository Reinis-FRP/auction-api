import { BigNumber, constants as ethersConstants, utils as ethersUtils } from "ethers";
import * as ss from "superstruct";

interface AuctionConfig {
  bidWaitTimeMs: number;
}

const DepositStruct = ss.object({
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

type DepositData = ss.Infer<typeof DepositStruct>;

interface AuctionData {
  auctionId: string;
  depositData: DepositData;
}

type EmitDeposit = (type: 'Deposit', dataType: AuctionData) => void;

type EmitTypes = EmitDeposit; // TODO: Add EmitComplete.

const isValidDepositData = (depositData: DepositData): boolean => {
  try {
    return (
      ethersUtils.isAddress(depositData.recipient) &&
      ethersUtils.isAddress(depositData.tokenAddress) &&
      Number(depositData.destinationChainId) > 0 && // If this is not supported chain, will fallback to regular deposit.
      BigNumber.from(depositData.amount).gte(0) && // Lower bound for uint256
      BigNumber.from(depositData.amount).lte(ethersConstants.MaxUint256) && // Upper bound for uint256
      BigNumber.from(depositData.relayerFeePct).gte(BigNumber.from(2).pow(63).mul(-1)) && // Lower bound for int64
      BigNumber.from(depositData.relayerFeePct).lt(BigNumber.from(2).pow(63)) && // Upper bound for int64
      BigNumber.from(depositData.quoteTimestamp).gte(0) && // Lower bound for uint32
      BigNumber.from(depositData.relayerFeePct).lt(BigNumber.from(2).pow(32)) && // Upper bound for uint32
      BigNumber.from(depositData.maxCount).gte(0) && // Lower bound for uint256
      BigNumber.from(depositData.maxCount).lte(ethersConstants.MaxUint256) && // Upper bound for uint256
      BigNumber.from(depositData.txValue).gte(0) && // Lower bound for uint256
      BigNumber.from(depositData.txValue).lte(ethersConstants.MaxUint256) // Upper bound for uint256
    );
  } catch {
    return false;
  }
};

export class Auction {
  private bidWaitTimeMs: number;
  private emit: EmitTypes;

  constructor(config: AuctionConfig, emit: EmitTypes) {
    this.bidWaitTimeMs = config.bidWaitTimeMs;
    this.emit = emit;
  }

  async deposit(depositData: DepositData): Promise<void> {
    if (!isValidDepositData(depositData)) throw new Error("Invalid depositData");

    // Announce auction to bidders.
    this.emit('Deposit', { auctionId: "0x0", depositData });

    await this.sleep(this.bidWaitTimeMs);
  }

  private sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
