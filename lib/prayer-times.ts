import { createClient } from "@/lib/supabase/server"

const ALMOSALY_BASE_URL = "https://almosaly.com"
const BURAIDAH_CITY_ID = "14"
const BURAIDAH_CITY_NAME = "بريدة"
const BURAIDAH_LATITUDE = "26.35"
const BURAIDAH_LONGITUDE = "43.96"
const RIYADH_TIMEZONE = "Asia/Riyadh"
const DEFAULT_ASR_GRACE_MINUTES = 50
const DAILY_PRAYER_TIMES_TABLE = "daily_prayer_times"
const ASR_PRAYER_NAME = "asr"
const CURRENT_DAY_CACHE_TTL_MS = 15 * 60 * 1000

const dailyAsrCache = new Map<string, { promise: Promise<string | null>; expiresAt: number }>()

function parseClockToMinutes(clock: string) {
	const [hours, minutes] = clock.split(" ")[0].split(":").map(Number)
	return hours * 60 + minutes
}

function isValidAsrTime(clock: string | null) {
	if (!clock) {
		return false
	}

	const [hourText, minuteText] = clock.split(" ")[0].split(":")
	const hour = Number(hourText)
	const minute = Number(minuteText)

	return Number.isFinite(hour) && Number.isFinite(minute) && hour >= 12 && hour <= 23 && minute >= 0 && minute <= 59
}

function extractAsrTimeFromHtml(html: string) {
	const prayerBlocks = html.matchAll(
		/<div class="prayTime newPrayTime[^"]*">[\s\S]*?<input type="hidden" class="mawaquitTime" value="\d{4}-\d{2}-\d{2} (\d{2}:\d{2})" \/>[\s\S]*?<img[^>]*alt="([^"]+)" title="([^"]+)"[\s\S]*?<\/div>\s*<\/div>/gi,
	)

	for (const match of prayerBlocks) {
		const prayerTime = match[1] || null
		const alt = (match[2] || "").toLowerCase()
		const title = (match[3] || "").toLowerCase()

		if ((alt === ASR_PRAYER_NAME || title === ASR_PRAYER_NAME) && isValidAsrTime(prayerTime)) {
			return prayerTime
		}
	}

	const encodedAsrMatch = html.match(/&quot;asr&quot;:&quot;(\d{2}):(\d{2})\s+\\u0645&quot;/i)
	if (encodedAsrMatch) {
		const encodedTime = `${encodedAsrMatch[1]}:${encodedAsrMatch[2]}`
		if (isValidAsrTime(encodedTime)) {
			return encodedTime
		}
	}

	return null
}

function formatMinutes(minutes: number) {
	const normalizedMinutes = ((minutes % 1440) + 1440) % 1440
	const hours = Math.floor(normalizedMinutes / 60)
	const mins = normalizedMinutes % 60
	return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
}

function getSaudiDateString(date = new Date()) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: RIYADH_TIMEZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date)
}

function isCurrentSaudiDate(attendanceDate: string) {
	return attendanceDate === getSaudiDateString()
}

function getRiyadhTimeParts(timestamp: string) {
	const formatter = new Intl.DateTimeFormat("en-GB", {
		timeZone: RIYADH_TIMEZONE,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	})

	const parts = formatter.formatToParts(new Date(timestamp))
	const hour = Number(parts.find((part) => part.type === "hour")?.value || "0")
	const minute = Number(parts.find((part) => part.type === "minute")?.value || "0")

	return {
		hour,
		minute,
		formatted: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
	}
}

async function getStoredBuraidahAsrTime(attendanceDate: string) {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from(DAILY_PRAYER_TIMES_TABLE)
			.select("prayer_time")
			.eq("prayer_date", attendanceDate)
			.eq("city_name", BURAIDAH_CITY_NAME)
			.eq("prayer_name", ASR_PRAYER_NAME)
			.maybeSingle()

		if (error || typeof data?.prayer_time !== "string" || !isValidAsrTime(data.prayer_time)) {
			return null
		}

		return data.prayer_time
	} catch {
		return null
	}
}

async function storeBuraidahAsrTime(attendanceDate: string, prayerTime: string) {
	try {
		const supabase = await createClient()
		await supabase.from(DAILY_PRAYER_TIMES_TABLE).upsert(
			{
				prayer_date: attendanceDate,
				city_id: BURAIDAH_CITY_ID,
				city_name: BURAIDAH_CITY_NAME,
				prayer_name: ASR_PRAYER_NAME,
				prayer_time: prayerTime,
				source: "Almosaly",
				fetched_at: new Date().toISOString(),
			},
			{ onConflict: "prayer_date,city_name,prayer_name" },
		)
	} catch {
		// If the table does not exist yet, keep the live fetch result and continue.
	}
}

export async function getBuraidahAsrTime(attendanceDate: string) {
	const isToday = isCurrentSaudiDate(attendanceDate)
	const cachedEntry = dailyAsrCache.get(attendanceDate)

	if (cachedEntry && cachedEntry.expiresAt > Date.now()) {
		return cachedEntry.promise
	}

	const promise = (async () => {
		const storedAsrTime = await getStoredBuraidahAsrTime(attendanceDate)
		if (storedAsrTime && !isToday) {
			return storedAsrTime
		}

		const url = new URL(`${ALMOSALY_BASE_URL}/home/getMawaquit`)
		url.searchParams.set("lat", BURAIDAH_LATITUDE)
		url.searchParams.set("lon", BURAIDAH_LONGITUDE)
		url.searchParams.set("id", BURAIDAH_CITY_ID)
		url.searchParams.set("date", attendanceDate)

		try {
			const response = await fetch(url.toString(), {
				headers: {
					"User-Agent": "Mozilla/5.0",
					"X-Requested-With": "XMLHttpRequest",
				},
				...(isToday ? { cache: "no-store" as const } : { next: { revalidate: 43200 } }),
			})

			if (!response.ok) {
				throw new Error(`Failed to fetch Almosaly prayer times: ${response.status}`)
			}

			const html = await response.text()
			const asrTime = extractAsrTimeFromHtml(html)

			if (asrTime) {
				if (asrTime !== storedAsrTime) {
					await storeBuraidahAsrTime(attendanceDate, asrTime)
				}
				return asrTime
			}
		} catch {
			if (storedAsrTime) {
				return storedAsrTime
			}
			throw new Error(`Failed to fetch Almosaly prayer times for ${attendanceDate}`)
		}

		return storedAsrTime
	})()

	dailyAsrCache.set(attendanceDate, {
		promise,
		expiresAt: isToday ? Date.now() + CURRENT_DAY_CACHE_TTL_MS : Number.POSITIVE_INFINITY,
	})

	return promise
}

export interface TeacherAttendanceTimingStatus {
	asrTime: string | null
	graceDeadline: string | null
	checkInTimeLocal: string | null
	isLate: boolean | null
	isEarly: boolean | null
	isOnTime: boolean | null
	timingCategory: "late" | "early" | "on-time" | null
	lateMinutes: number | null
	city: string
	graceMinutes: number
	source: string
}

export async function getTeacherAttendanceTimingStatus(
	record: { attendance_date: string; check_in_time: string; status: string },
	graceMinutes = DEFAULT_ASR_GRACE_MINUTES,
) {
	const asrTime = await getBuraidahAsrTime(record.attendance_date)

	if (!asrTime || record.status !== "present") {
		return {
			asrTime,
			graceDeadline: asrTime ? formatMinutes(parseClockToMinutes(asrTime) + graceMinutes) : null,
			checkInTimeLocal: record.check_in_time ? getRiyadhTimeParts(record.check_in_time).formatted : null,
			isLate: null,
			isEarly: null,
			isOnTime: null,
			timingCategory: null,
			lateMinutes: null,
			city: BURAIDAH_CITY_NAME,
			graceMinutes,
			source: "Almosaly",
		} satisfies TeacherAttendanceTimingStatus
	}

	const asrMinutes = parseClockToMinutes(asrTime)
	const graceDeadlineMinutes = asrMinutes + graceMinutes
	const localCheckIn = getRiyadhTimeParts(record.check_in_time)
	const checkInMinutes = localCheckIn.hour * 60 + localCheckIn.minute
	const lateMinutes = Math.max(0, checkInMinutes - graceDeadlineMinutes)
	const isEarly = checkInMinutes < graceDeadlineMinutes
	const isOnTime = checkInMinutes === graceDeadlineMinutes

	return {
		asrTime: formatMinutes(asrMinutes),
		graceDeadline: formatMinutes(graceDeadlineMinutes),
		checkInTimeLocal: localCheckIn.formatted,
		isLate: lateMinutes > 0,
		isEarly,
		isOnTime,
		timingCategory: lateMinutes > 0 ? "late" : isEarly ? "early" : "on-time",
		lateMinutes,
		city: BURAIDAH_CITY_NAME,
		graceMinutes,
		source: "Almosaly",
	} satisfies TeacherAttendanceTimingStatus
}