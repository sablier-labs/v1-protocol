import dayjs from "dayjs";

import { BLOCK_TIME_AVERAGE, INTERVALS, INTERVAL_MINUTES } from "../constants/time";

export function getBlockDeltaForInterval(interval) {
  if (!Object.keys(INTERVALS).includes(interval)) {
    throw new Error(`Expected ${interval} to be one of ${INTERVALS}`);
  }

  const seconds = getSecondsForInterval(interval);
  return (seconds / BLOCK_TIME_AVERAGE).toFixed(0);
}

/**
 * @dev We assume the block time is BLOCK_TIME_AVERAGE.
 *
 * @param {Object} currentBlockNumber the current block number on the Ethereum blockchain
 * @param {Object} time dayjs instance
 */
export function getBlockDeltaFromNow(currentBlockNumber, time) {
  if (!currentBlockNumber) {
    throw new Error(`Expected ${currentBlockNumber} to be a valid integer`);
  }
  if (!isDayJs(time)) {
    throw new Error(`Expected ${time} to be instances of dayjs`);
  }

  const now = dayjs();
  const unixDelta = Math.abs(time.subtract(now.unix(), "second").unix());
  return (currentBlockNumber + unixDelta / BLOCK_TIME_AVERAGE).toFixed(0);
}

export function getMinutesForInterval(interval) {
  return INTERVAL_MINUTES[interval] || 0;
}

export function getMinutesForBlockDelta(blockDelta) {
  const seconds = getSecondsForBlockDelta(blockDelta);
  return Math.floor(seconds / 60);
}

export function getSecondsForInterval(interval) {
  return INTERVAL_MINUTES[interval] * 60 || 0;
}

export function getSecondsForBlockDelta(blockDelta) {
  return blockDelta * BLOCK_TIME_AVERAGE;
}

export function getTimeForBlockDelta(blockDelta, forPast = true) {
  const seconds = getSecondsForBlockDelta(blockDelta);
  let now = dayjs();

  if (forPast) {
    now = now.subtract(seconds, "second");
  } else {
    now = now.add(seconds, "second");
  }

  // now = now.second(0).millisecond(0);
  return now;
}

export function isDayJs(time) {
  return time instanceof dayjs;
}

export function isIntervalShorterThanADay(intervalKey) {
  const seconds = getSecondsForInterval(intervalKey);
  const secondsInDay = getSecondsForInterval("day");
  return seconds < secondsInDay;
}

// Round up to the closest higher-up interval, with the following caveat: the offset is actually
// 8 mins + the interval. That is, if the current interval ends in the following 8 mins, we just
// exclude it to defend against weird UX outcomes - a failing Ethereum transaction due to the current
// block number being higher than the start of the stream.
export function roundTime(time) {
  const coefficient = 1000 * 60 * INTERVAL_MINUTES.hour;
  let roundedTime = dayjs(Math.ceil(time.valueOf() / coefficient) * coefficient);
  if (
    dayjs()
      .add(8, "minute")
      .isAfter(roundedTime)
  ) {
    roundedTime = roundedTime.add(coefficient, "millisecond");
  }
  return roundedTime;
}
