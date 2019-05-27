import { BigNumber as BN } from "bignumber.js";

export const SABLIER_FORMAT = "DD MMM YYYY @ h:mma";
export const SABLIER_FORMAT_DAY = "DD MMM YYYY";
export const SABLIER_FORMAT_MONTH = "MMM YYYY";
export const SABLIER_FORMAT_HOUR = "DD MMM YYYY @ h:00a";

/**
 * We gauge time using blocks which, on Ethereum, are mined once per 15 seconds.
 * We use that interval as the fundamental time unit of Sablier.
 *
 * @see https://twitter.com/PaulRBerg/status/1132368476918702080?
 * @see https://twitter.com/PaulRBerg/status/1123139665647808512
 */
export const MAINNET_BLOCK_TIME_AVERAGE =
  process.env.NODE_ENV === "production" ? BN(14) : BN(process.env.MAINNET_BLOCK_TIME_AVERAGE || 15);

export const INTERVALS = {
  minute: "Minute",
  quarterHour: "Quarter-Hour",
  hour: "Hour",
  day: "Day",
};

/**
 * Measured in blocks
 */
export const INTERVAL_BLOCKS = {
  minute: 4,
  quarterHour: 60,
  hour: 240,
  day: 5760,
  month: 172800,
  year: 2073600,
};

/**
 * Measured in minutes
 */
export const INTERVAL_MINUTES = {
  minute: 1,
  quarterHour: 15,
  hour: 60,
  day: 1440,
  month: 43200,
  year: 518400,
};
