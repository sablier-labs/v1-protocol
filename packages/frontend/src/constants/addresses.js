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
  sablierAddress: "0xeef1392e7044993Fd28bf7878DF85A365b540b92"
};

export const RINKEBY = {
  tokenAddresses: {
    addresses: [["DAI", "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725"]],
  },
  tokenAddressesToSymbols: {
    "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725": "DAI",
  },
  sablierAddress: "0xEC8232ae71f054AEFF4f3EAdD4c8d334732Cbe4b",
};

export const ACCEPTED_TOKENS = ["DAI", "GUSD", "USDC"];
export const DEFAULT_TOKEN_SYMBOL = "DAI";
