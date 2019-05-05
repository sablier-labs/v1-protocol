import { MAINNET, RINKEBY } from "../../constants/addresses";

const SET_ADDRESSES = "app/addresses/setAddresses";

const initialState = MAINNET;

export const setAddresses = (networkId) => {
  switch (networkId) {
    // Main Net
    case 1:
    case "1":
      return {
        type: SET_ADDRESSES,
        payload: MAINNET,
      };
    // Rinkeby
    case 4:
    case "4":
      return {
        type: SET_ADDRESSES,
        payload: RINKEBY,
      };

    default:
      return {
        type: SET_ADDRESSES,
        payload: MAINNET,
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
