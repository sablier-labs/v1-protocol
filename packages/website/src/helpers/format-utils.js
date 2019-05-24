import dayjs from "dayjs";

import {
  INTERVAL_MINUTES,
  SABLIER_FORMAT,
  SABLIER_FORMAT_HOUR,
  SABLIER_FORMAT_MONTH,
} from "../constants/time";

/**
 * @param translations( the i18n object
 * @param duration duration to format in minutes
 * @param minimumInterval the minimum interval to format the duration to
 */
export function formatDuration(translations, duration, minimumInterval = INTERVAL_MINUTES.minute) {
  if (duration >= INTERVAL_MINUTES.year) {
    return translations("aLot");
  }

  let result = [];

  const months = Math.floor(duration / INTERVAL_MINUTES.month);
  if (months) {
    result.push(`${months} ${translations("month", { count: months })}`);

    if (minimumInterval >= INTERVAL_MINUTES.month) {
      return result.join(" ");
    }
  }
  duration %= INTERVAL_MINUTES.month;

  const days = Math.floor(duration / INTERVAL_MINUTES.day);
  if (days) {
    result.push(`${days} ${translations("day", { count: days })}`);

    if (minimumInterval >= INTERVAL_MINUTES.day) {
      return result.join(" ");
    }
  }
  duration %= INTERVAL_MINUTES.day;

  const hours = Math.floor(duration / INTERVAL_MINUTES.hour);
  if (hours) {
    result.push(`${hours} ${translations("hr", { count: hours })}`);
    if (minimumInterval >= INTERVAL_MINUTES.hour) {
      return result.join(" ");
    }
  }
  duration %= INTERVAL_MINUTES.hour;

  // Purposefully omitting the quarter hour ...

  const minutes = Math.floor(duration / INTERVAL_MINUTES.minute);
  if (minutes) {
    result.push(`${minutes} ${translations("min", { count: minutes })}`);
  }

  return result.join(" ") || "0";
}

export function formatTime(translations, time, opts = {}) {
  if (!(time instanceof dayjs)) {
    throw new Error("Expected dayjs object");
  }
  let format = SABLIER_FORMAT;

  if (opts.minimumInterval) {
    switch (opts.minimumInterval) {
      case INTERVAL_MINUTES.month:
        format = SABLIER_FORMAT_MONTH;
        break;
      // Purposefully set to HOUR because you kinda want to see the start and stop hours anyway
      case INTERVAL_MINUTES.day:
        format = SABLIER_FORMAT_HOUR;
        break;
      case INTERVAL_MINUTES.hour:
        format = SABLIER_FORMAT_HOUR;
        break;
      default:
        break;
    }
  }

  let formattedTime = time.format(format);

  if (opts.prettyPrint) {
    const today = dayjs().format("DD MMM YYYY");
    const tomorrow = dayjs()
      .add(1, "day")
      .format("DD MMM YYYY");
    formattedTime = formattedTime.replace(today, translations("today")).replace(tomorrow, translations("tomorrow"));
  }

  return formattedTime;
}

export function roundToDecimalPoints(num, places) {
  return +(Math.round(num + "e+" + places) + "e-" + places);
}
