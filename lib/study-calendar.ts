function normalizeDate(dateValue: Date | string) {
  const date = typeof dateValue === "string" ? new Date(`${dateValue}T00:00:00`) : new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isStudyDay(dateValue: Date | string) {
  const day = normalizeDate(dateValue).getDay();
  return day !== 5 && day !== 6;
}

export function getStudyWeekStart(anchor: Date | string = new Date()) {
  const normalizedAnchor = normalizeDate(anchor);
  const start = new Date(normalizedAnchor);
  start.setDate(normalizedAnchor.getDate() - normalizedAnchor.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

export function getStudyWeekEnd(anchor: Date | string = new Date()) {
  const normalizedAnchor = normalizeDate(anchor);
  const end = new Date(normalizedAnchor);

  if (!isStudyDay(normalizedAnchor)) {
    const start = getStudyWeekStart(normalizedAnchor);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 4);
  }

  end.setHours(23, 59, 59, 999);
  return end;
}