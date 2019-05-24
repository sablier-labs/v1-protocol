import { BigNumber as BN } from "bignumber.js";
import { roundToDecimalPoints } from "./format-utils";
/**
 * Convert value measured in ERC20 decimals to the base unit
 *
 * @param {number} BN value to be converted
 * @param {number} ERC20 decimals
 */
export function getUnitValue(value, decimals, opts = {}) {
  if (!BN.isBigNumber(value)) {
    throw new Error(`Expected ${value} to be an instance of BN`);
  }
  const divisor = new BN(10 ** (decimals || 18));
  let unitValue = value.dividedBy(divisor).toNumber();
  if (opts.decimalPoints) {
    unitValue = roundToDecimalPoints(unitValue, opts.decimalPoints);
  }
  return unitValue;
}
