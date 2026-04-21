import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: NextRequest) {
	try {
		const accountNumber = request.nextUrl.searchParams.get("account_number")

		if (!accountNumber) {
			return NextResponse.json({ error: "رقم الحساب مطلوب" }, { status: 400 })
		}

		const supabase = createAdminClient()

		const { data: user } = await supabase
			.from("users")
			.select("id, created_at, role")
			.eq("account_number", Number(accountNumber))
			.maybeSingle()

		if (user?.created_at) {
			return NextResponse.json({ created_at: user.created_at, source: "users", role: user.role || null })
		}

		const { data: student } = await supabase
			.from("students")
			.select("id, created_at")
			.eq("account_number", Number(accountNumber))
			.maybeSingle()

		if (student?.created_at) {
			return NextResponse.json({ created_at: student.created_at, source: "students", role: "student" })
		}

		return NextResponse.json({ created_at: null })
	} catch (error) {
		console.error("[account-created-at][GET]", error)
		return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
	}
}