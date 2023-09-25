import { BigNumber, constants as ethersConstants, utils as ethersUtils } from "ethers";

interface DepositData {
  recipient: string;
  tokenAddress: string;
  amount: string; // This was BigNumber in Frontend.
  destinationChainId: number; // This is ChainId Enum in Frontend.
  relayerFeePct: string; // This was BigNumber in Frontend.
  quoteTimestamp: string; // This was BigNumber in Frontend.
  message: string;
  maxCount: string; // This was BigNumber in Frontend.
  txValue: string; // This was BigNumber in Frontend.
}

// Helper type guard for dictionary objects.
const isDictionary = (arg: unknown): arg is Record<string, unknown> => {
  return typeof arg === "object" && arg !== null && !Array.isArray(arg);
};

// Type guard for DepositData.
const isDepositData = (depositData: unknown): depositData is DepositData => {
  if (!isDictionary(depositData)) return false;
  try {
    return (
      typeof depositData.recipient == "string" &&
      ethersUtils.isAddress(depositData.recipient) &&
      typeof depositData.tokenAddress == "string" &&
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

const parseDepositData = (stringifiedParams: string): DepositData => {
  let depositData;
  try {
    depositData = JSON.parse(stringifiedParams);
  } catch {
    throw new Error("Invalid Deposit parameters");
  }
  if (!isDepositData(depositData)) throw new Error("Invalid Deposit parameters");
  return depositData;
};

export class Auction {
  async deposit(stringifiedParams: string): Promise<void> {
    const depositData = parseDepositData(stringifiedParams);
  }
}
