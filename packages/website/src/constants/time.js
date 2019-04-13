export const SABLIER_FORMAT = "DD MMM YYYY @ h:mma";

/**
 * We measure time using blocks which, on Ethereum, are mined once per 15 seconds.
 * We use that interval as the fundamental time unit of Sablier.
 *
 * @see https://twitter.com/PaulRBerg/status/1123139665647808512
 */
export const BLOCK_TIME_AVERAGE = 15;

export const intervalStringValues = {
  minute: "Minute",
  quarterHour: "Quarter-Hour",
  hour: "Hour",
  day: "Day",
};

/**
 * Measured in blocks
 */
export const intervalBlocks = {
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
export const intervalMins = {
  minute: 1,
  quarterHour: 15,
  hour: 60,
  day: 1440,
  month: 43200,
  year: 518400
};
