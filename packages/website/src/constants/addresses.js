export const MAINNET = {
  tokenAddresses: {
    addresses: [
      ["DAI", "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"],
      ["GUSD", "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd"],
      ["PAX", "0x8E870D67F660D95d5be530380D0eC0bd388289E1"],
      ["TUSD", "0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E"],
      ["USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    ],
  },
  tokenAddressesToLabels: {
    "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359": "DAI",
    "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd": "GUSD",
    "0x8E870D67F660D95d5be530380D0eC0bd388289E1": "PAX",
    "0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E": "TUSD",
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48": "USDC",
  },
  sablierAddress: "0x0000000000000000000000000000000000000001",
};

export const RINKEBY = {
  tokenAddresses: {
    addresses: [["DAI", "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725"]],
  },
  tokenAddressesToLabels: {
    "0x8ad3aA5d5ff084307d28C8f514D7a193B2Bfe725": "DAI",
  },
  sablierAddress: "0xBB6209d27791D3c52BDb4a0FE4CE1cf99156BBeF",
};

export const acceptedTokens = ["DAI", "GUSD", "PAX", "TUSD", "USDC"];
