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

export function getMinsForIntervalKey(key) {
  return intervalMins[key] || 0;
}

export function isDayJs(time) {
  return time instanceof dayjs;
}

export function isIntervalShorterThanADay(intervalKey) {
  const minutes = getMinsForIntervalKey(intervalKey);
  return minutes < intervalMins.day;
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
  const seconds = time.subtract(now.second(), "second");
  return currentBlockNumber + ( seconds / BLOCK_TIME_AVERAGE );
}
