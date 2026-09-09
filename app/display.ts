export function shortDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return Number(month) + "月" + Number(day) + "日";
}

export function longDate(isoDate: string) {
  const [year] = isoDate.split("-");
  return year + "年" + shortDate(isoDate);
}

export function compactDate(isoDate: string) {
  const [, month, day] = isoDate.split("-");
  return Number(month) + "/" + Number(day);
}

export function weekLabel(dates: string[]) {
  const [firstDate] = dates;
  const lastDate = dates[dates.length - 1];
  return (
    longDate(firstDate) +
    " — " +
    (firstDate.slice(0, 4) === lastDate.slice(0, 4) ? shortDate(lastDate) : longDate(lastDate))
  );
}

export function progressStatusLabel(status: string) {
  if (status === "completed") return "已看完";
  if (status === "in-progress") return "在追";
  return "未开始";
}
