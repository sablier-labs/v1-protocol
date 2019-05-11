// reducers.js
import { combineReducers } from "redux";
import { connectRouter } from "connected-react-router";

import addresses from "./addresses";
import pending from "./pending";
import web3connect from "./web3connect";

export default (history) => {
  return combineReducers({
    addresses,
    pending,
    router: connectRouter(history),
    web3connect,
  });
};
