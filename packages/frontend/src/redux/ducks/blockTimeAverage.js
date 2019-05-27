import { MAINNET_BLOCK_TIME_AVERAGE } from "../../constants/time";

const SET_BLOCK_TIME_AVERAGE = "app/blockTimeAverage/setBlockTimeAverage";

const initialState = {
  blockTimeAverage: MAINNET_BLOCK_TIME_AVERAGE,
};

// @dev this duck is still WIP. It's not being used in the dApp.
export const setBlockTimeAverage = (networkId) => {
  switch (networkId) {
    // Main Net
    case 1:
    case "1":
      return {
        type: SET_BLOCK_TIME_AVERAGE,
        payload: {
          blockTimeAverage: MAINNET_BLOCK_TIME_AVERAGE,
        },
      };
    // Rinkeby
    case 4:
    case "4":
      return {
        type: SET_BLOCK_TIME_AVERAGE,
        payload: {
          blockTimeAverage: 15,
        },
      };

    default:
      return {
        type: SET_BLOCK_TIME_AVERAGE,
        payload: {
          blockTimeAverage: MAINNET_BLOCK_TIME_AVERAGE,
        },
      };
  }
};

export default (state = initialState, { type, payload }) => {
  switch (type) {
    case SET_BLOCK_TIME_AVERAGE:
      return payload;
    default:
      return state;
  }
};
