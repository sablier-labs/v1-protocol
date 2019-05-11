import { MAINNET, RINKEBY } from "../constants/addresses";
import { networkNamesToIds } from "../constants/networks";

export const getTokenLabelForAddress = (networkId, address) => {
  if (networkId === networkNamesToIds.rinkeby) {
    return RINKEBY.tokenAddressesToLabels[address];
  }
  return MAINNET.tokenAddressesToLabels[address];
};
