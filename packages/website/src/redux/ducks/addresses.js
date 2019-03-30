const RINKEBY = {
  tokenAddresses: {
    addresses: [["DAI", "0x2448eE2641d78CC42D7AD76498917359D961A783"]],
  },
  sablierAddress: "0xE7dbdcF6FE321296dD27540C3f324B4A57d17892",
};

const MAIN = {
  tokenAddresses: {
    addresses: [
      ["DAI", "0x89d24A6b4CcB1B6fAA2625fE562bDD9a23260359"],
      ["GUSD", "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd"],
      ["PAX", "0x8E870D67F660D95d5be530380D0eC0bd388289E1"],
      ["SUSD", "0x0cbe2df57ca9191b64a7af3baa3f946fa7df2f25"],
      ["TUSD", "0x8dd5fbCe2F6a956C3022bA3663759011Dd51e73E"],
      ["USDC", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
    ],
  },
  sablierAddress: "0x0000000000000000000000000000000000000001",
};

const SET_ADDRESSES = "app/addresses/setAddresses";

const initialState = RINKEBY;

export const addToken = ({ token, tokenAddress }) => (dispatch, getState) => {
  console.log("addToken");
};

export const setAddresses = (networkId) => {
  switch (networkId) {
    // Main Net
    case 1:
    case "1":
      return {
        type: SET_ADDRESSES,
        payload: MAIN,
      };
    // Rinkeby
    case 4:
    case "4":
    default:
      return {
        type: SET_ADDRESSES,
        payload: RINKEBY,
      };
  }
};

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case SET_ADDRESSES:
      return payload;
    default:
      return state;
  }
};
