import dayjs from "dayjs";
import { BigNumber as BN } from "bignumber.js";
import { INTERVAL_MINUTES } from "../constants/time";

/**
 * Round up to the closest hour slot, with the following caveat: the offset is 7 mins.
 * That is, if the current interval ends in the following 7 mins, we just exclude it
 * to prevent weird UX outcomes - a failing Ethereum transaction due to the current
 * block number being higher than the start of the stream.
 */
export function getMinStartTime() {
  const now = dayjs();
  const coefficient = 60 * INTERVAL_MINUTES.hour;
  let roundedTime = dayjs.unix(Math.ceil(now.unix() / coefficient) * coefficient);
  if (now.add(7, "minute").isAfter(roundedTime)) {
    roundedTime = roundedTime.add(coefficient, "second");
  }
  return roundedTime;
}

/**
 * We may end up rewriting this to use seconds instead of minutes.
 *
 * @param {string} interval name of the interval (minute, hour, day etc)
 */
export function getMinutesForInterval(interval) {
  return BN(INTERVAL_MINUTES[interval] || 0);
}

export function isDayJs(time) {
  return time instanceof dayjs;
}

export function isIntervalShorterThanADay(intervalKey) {
  const minutes = getMinutesForInterval(intervalKey);
  const minutesInDay = getMinutesForInterval("day");
  return minutes.isLessThan(minutesInDay);
}

export function roundTimeAroundHour(time) {
  if (!isDayJs(time)) {
    throw new Error(`Expected ${time} to be an instance of dayjs`);
  }
  const coefficient = 60 * INTERVAL_MINUTES.hour;
  return dayjs.unix(Math.round(time.unix() / coefficient) * coefficient);
}
