export const gauntletDeployments: Record<number, string> = {
  5: "0x55ac15D7f3610c3aaf3f891cA62964B30e7fAb68", // Ethereum Goerli
  421613: "0x284ca1d6841C05942658Cd062E220Cb831964872", // Arbitrum Goerli
};

export const baseDomain = {
  name: "RelayerCartel",
  version: "0",
  chainId: 1, // Will be overriden with actual target chainId.
};

export const signatureTypes = {
  auction: [
    { name: "id", type: "uint32" },
    { name: "expiry", type: "uint32" },
  ],
};
