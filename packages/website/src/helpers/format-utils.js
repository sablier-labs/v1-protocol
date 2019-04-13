import dayjs from "dayjs";

import { intervalMins, SABLIER_FORMAT } from "../constants/time";

export function formatDuration(t, duration) {
  if (duration >= intervalMins.year) {
    return t("aLot");
  }

  let result = [];

  const months = Math.floor(duration / intervalMins.month);
  if (months) {
    result.push(`${months} ${t(months > 1 ? "months" : "month")}`);
  }

  duration %= intervalMins.month;
  const days = Math.floor(duration / intervalMins.day);
  if (days) {
    result.push(`${days} ${t(days > 1 ? "days" : "day")}`);
  }

  duration %= intervalMins.day;
  const hours = Math.floor(duration / intervalMins.hour);
  if (hours) {
    result.push(`${hours} ${t(hours > 1 ? "hours" : "hour")}`);
  }

  if (result.length === 0) {
    return "0";
  }
  return result.join(" ");
}

export function formatTime(t, time) {
  if (!(time instanceof dayjs)) {
    throw new Error("Expected dayjs object");
  }
  const today = dayjs().format("DD MMM YYYY");
  const tomorrow = dayjs()
    .add(1, "day")
    .format("DD MMM YYYY");
  return time
    .format(SABLIER_FORMAT)
    .replace(today, t("today"))
    .replace(tomorrow, t("tomorrow"));
}

export function roundToDecimalPlaces(num, places) {
  return +(Math.round(num + "e+" + places) + "e-" + places);
}
