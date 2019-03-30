/**
 * We measure time using blocks which, on Ethereum, are mined once per 15 seconds.
 * We use that interval as the fundamental time unit of Sablier.
 */
export const TIME_UNIT = 15;

export default {
  "minute": 4,
  "hour": 240,
  "day": 4760,
  "week": 33320,
};
