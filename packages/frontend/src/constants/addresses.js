export const MAINNET = {
  tokenAddresses: {
    addresses: [
      ["DAI", "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"],
      ["GUSD", "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd"],
      ["USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    ],
  },
  tokenAddressesToSymbols: {
    "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359": "DAI",
    "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd": "GUSD",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
  },
  sablierAddress: "0x0000000000000000000000000000000000000001",
};

export const RINKEBY = {
  tokenAddresses: {
    addresses: [["DAI", "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725"]],
  },
  tokenAddressesToSymbols: {
    "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725": "DAI",
  },
  sablierAddress: "0x32Ef6010D97fc0D10f0D0AB842C141CbD266C98D",
};

export const ACCEPTED_TOKENS = ["DAI", "GUSD", "USDC"];
export const DEFAULT_TOKEN_SYMBOL = "DAI";
