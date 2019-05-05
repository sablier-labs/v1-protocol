import dayjs from "dayjs";

import { BLOCK_TIME_AVERAGE, intervalStringValues, intervalMins } from "../constants/time";

export function getHighestIntervalShorterThanADay() {
  const length = intervalMins.length;
  for (let i = length - 1; i >= 0; ++i) {
    const minutes = intervalMins[i];
    if (minutes < intervalMins.day) {
      return minutes;
    }
  }
  return intervalMins[intervalStringValues.hour];
}

export function getMinsForInterval(interval) {
  return intervalMins[interval] || 0;
}

export function getSecondsForInterval(interval) {
  return intervalMins[interval] * 60 || 0;
}

export function isDayJs(time) {
  return time instanceof dayjs;
}

export function isIntervalShorterThanADay(intervalKey) {
  const minutes = getSecondsForInterval(intervalKey);
  const minutesInDay = getSecondsForInterval("day");
  return minutes < minutesInDay;
}

export function intervalToBlocks(interval) {
  if (!Object.keys(intervalStringValues).includes(interval)) {
    throw new Error(`Expected ${interval} to be one of ${intervalStringValues}`);
  }

  const seconds = getSecondsForInterval(interval);
  return (seconds / BLOCK_TIME_AVERAGE).toFixed(0);
}

/**
 * @dev We assume the block time is BLOCK_TIME_AVERAGE.
 *
 * @param {Object} web3
 * @param {Object} time
 */
export async function timeToBlockNumber(web3, time) {
  if (!isDayJs(time)) {
    throw new Error(`Expected ${time} to be an instance of dayjs`);
  }

  const currentBlockNumber = await web3.eth.getBlockNumber();
  const now = dayjs();
  const unixDelta = time.subtract(now.unix(), "second").unix();
  return (currentBlockNumber + unixDelta / BLOCK_TIME_AVERAGE).toFixed(0);
}
