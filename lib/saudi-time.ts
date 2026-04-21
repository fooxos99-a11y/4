const RIYADH_TIME_ZONE = "Asia/Riyadh"

export function getSaudiDateString(date = new Date()) {
	const formatter = new Intl.DateTimeFormat("en-CA", {
		timeZone: RIYADH_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	})

	return formatter.format(date)
}

export function getSaudiWeekdayIndex(date = new Date()) {
	const weekday = new Intl.DateTimeFormat("en-US", {
		timeZone: RIYADH_TIME_ZONE,
		weekday: "short",
	}).format(date)

	const weekdayMap: Record<string, number> = {
		Sun: 0,
		Mon: 1,
		Tue: 2,
		Wed: 3,
		Thu: 4,
		Fri: 5,
		Sat: 6,
	}

	return weekdayMap[weekday] ?? date.getUTCDay()
}

export function getSaudiTimeString(date = new Date()) {
	return date.toLocaleTimeString("ar-SA", {
		timeZone: RIYADH_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	})
}

export function formatSaudiTimeWithPeriod(timeValue: string) {
	const normalized = timeValue.includes("T") ? new Date(timeValue) : null

	if (normalized && !Number.isNaN(normalized.getTime())) {
		const formatter = new Intl.DateTimeFormat("en-GB", {
			timeZone: RIYADH_TIME_ZONE,
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		})
		const parts = formatter.formatToParts(normalized)
		const hour = Number(parts.find((part) => part.type === "hour")?.value || "0")
		const minute = Number(parts.find((part) => part.type === "minute")?.value || "0")
		return formatHourMinuteWithPeriod(hour, minute)
	}

	const [hourText, minuteText] = timeValue.split(" ")[0].split(":")
	const hour = Number(hourText)
	const minute = Number(minuteText)

	if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
		return timeValue
	}

	return formatHourMinuteWithPeriod(hour, minute)
}

function formatHourMinuteWithPeriod(hour24: number, minute: number) {
	const period = hour24 >= 12 ? "م" : "ص"
	const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12
	return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`
}