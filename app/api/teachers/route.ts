import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { NextResponse } from "next/server"
import { isPrivilegedRole, requireRoles } from "@/lib/auth/guards"

function getErrorMessage(error: unknown) {
  if (!error) return "حدث خطأ غير معروف"
  if (error instanceof Error) return error.message || "حدث خطأ غير معروف"
  if (typeof error === "object") {
    const candidate = error as { message?: string; details?: string; hint?: string; code?: string }
    return candidate.message || candidate.details || candidate.hint || candidate.code || JSON.stringify(candidate)
  }

  return String(error)
}

export async function GET(request: Request) {
  try {
    const auth = await requireRoles(request, ["teacher", "deputy_teacher", "admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const { session } = auth
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const accountNumber = searchParams.get("account_number")

    if (accountNumber) {
      if (!isPrivilegedRole(session.role) && String(session.accountNumber) !== String(accountNumber)) {
        return NextResponse.json({ error: "لا يمكنك الوصول إلى بيانات معلم آخر" }, { status: 403 })
      }

      const { data: teachers, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["teacher", "deputy_teacher"])
        .eq("account_number", accountNumber)
        .limit(1)

      if (error) {
        console.error("[v0] Error fetching teacher by account number:", error)
        return NextResponse.json({ error: "فشل في جلب بيانات المعلم" }, { status: 500 })
      }

      if (!teachers || teachers.length === 0) {
        return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 })
      }

      const teacher = teachers[0]
      return NextResponse.json({
        teachers: [{
          id: teacher.id,
          name: teacher.name,
          account_number: teacher.account_number,
          accountNumber: teacher.account_number?.toString() || "",
          idNumber: teacher.id_number || "",
          halaqah: teacher.halaqah || "",
          phoneNumber: teacher.phone_number || "",
        }]
      }, { status: 200 })
    }

    if (!isPrivilegedRole(session.role)) {
      return NextResponse.json({
        teachers: [{
          id: session.id,
          name: session.name,
          accountNumber: session.accountNumber,
          idNumber: "",
          halaqah: session.halaqah || "",
          studentCount: 0,
          phoneNumber: "",
          role: session.role,
        }],
      }, { status: 200 })
    }

    const { data: teachers, error } = await supabase
      .from("users")
      .select("*")
      .in("role", ["teacher", "deputy_teacher"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching teachers:", error)
      return NextResponse.json({ error: "فشل في جلب المعلمين" }, { status: 500 })
    }

    // For each teacher, count their students (ignore case and trim spaces)
    const teachersWithStudentCount = await Promise.all(
      (teachers || []).map(async (teacher) => {
        // جلب جميع الطلاب ثم العد برمجياً مع التطبيع
        const { data: students, error: studentsError } = await supabase
          .from("students")
          .select("halaqah")

        let count = 0;
        if (students && Array.isArray(students)) {
          const teacherHalaqah = (teacher.halaqah || "").trim().toLowerCase();
          count = students.filter(
            (student) => (student.halaqah || "").trim().toLowerCase() === teacherHalaqah
          ).length;
        }

        return {
          id: teacher.id,
          name: teacher.name,
          accountNumber: teacher.account_number?.toString() || "",
          idNumber: teacher.id_number || "",
          halaqah: teacher.halaqah || "",
          studentCount: count || 0,
          phoneNumber: teacher.phone_number || "",
          role: teacher.role || "teacher",
        }
      })
    );

    return NextResponse.json({ teachers: teachersWithStudentCount }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in GET /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = await createClient()
    const body = await request.json()
    const { name, id_number, account_number, halaqah, role } = body

    if (!name || !id_number || !account_number || !halaqah) {
      return NextResponse.json({ error: "جميع الحقول مطلوبة" }, { status: 400 })
    }

    const assignedRole = role === "deputy_teacher" ? "deputy_teacher" : "teacher"

    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("account_number", account_number)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({ error: "رقم الحساب موجود بالفعل" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          id_number,
          role: assignedRole,
          halaqah,
          account_number: Number.parseInt(account_number),
          password_hash: "",
        },
      ])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error adding teacher:", error)
      return NextResponse.json({ error: "فشل في إضافة المعلم" }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        teacher: {
          id: data.id,
          name: data.name,
          accountNumber: data.account_number?.toString() || "",
          idNumber: data.id_number || "",
          halaqah: data.halaqah || "",
          studentCount: 0,
          role: data.role || "teacher",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("[v0] Error in POST /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)
    const teacherId = String(searchParams.get("id") || "").trim()

    if (!teacherId) {
      return NextResponse.json({ error: "معرف المعلم مطلوب" }, { status: 400 })
    }

    const { data: teacher, error: teacherLookupError } = await supabase
      .from("users")
      .select("id")
      .eq("id", teacherId)
      .in("role", ["teacher", "deputy_teacher"])
      .maybeSingle()

    if (teacherLookupError) {
      console.error("[v0] Error finding teacher before removal:", teacherLookupError)
      return NextResponse.json({ error: getErrorMessage(teacherLookupError) }, { status: 500 })
    }

    if (!teacher) {
      return NextResponse.json({ error: "المعلم غير موجود" }, { status: 404 })
    }

    const { error: clearWhatsappMessagesError } = await supabase
      .from("whatsapp_messages")
      .update({ sent_by: null })
      .eq("sent_by", teacherId)

    if (clearWhatsappMessagesError && clearWhatsappMessagesError.code !== "42P01") {
      console.error("[v0] Error clearing teacher WhatsApp references:", clearWhatsappMessagesError)
      return NextResponse.json({ error: getErrorMessage(clearWhatsappMessagesError) }, { status: 500 })
    }

    const { error } = await supabase
      .from("users")
      .delete()
      .eq("id", teacherId)
      .in("role", ["teacher", "deputy_teacher"])

    if (error) {
      console.error("[v0] Error removing teacher:", error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in DELETE /api/teachers:", error)
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id, name, phone_number, id_number, account_number, halaqah, role } = body

    if (!id) {
      return NextResponse.json({ error: "معرف المعلم مطلوب" }, { status: 400 })
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (phone_number !== undefined) updateData.phone_number = phone_number
    if (id_number !== undefined) updateData.id_number = id_number
    if (account_number !== undefined) updateData.account_number = account_number
    if (halaqah !== undefined) updateData.halaqah = halaqah
    if (role !== undefined) updateData.role = role === "deputy_teacher" ? "deputy_teacher" : "teacher"

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "لا توجد بيانات لتحديثها" }, { status: 400 })
    }

    if (account_number !== undefined) {
      const { data: existingUser, error: accountError } = await supabase
        .from("users")
        .select("id")
        .eq("account_number", account_number)
        .neq("id", id)
        .maybeSingle()

      if (accountError) {
        console.error("[v0] Error checking teacher account number:", accountError)
        return NextResponse.json({ error: "تعذر التحقق من رقم الحساب" }, { status: 500 })
      }

      if (existingUser) {
        return NextResponse.json({ error: "رقم الحساب مستخدم بالفعل" }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .in("role", ["teacher", "deputy_teacher"])
      .select()
      .single()

    if (error) {
      console.error("[v0] Error updating teacher:", error)
      return NextResponse.json({ error: "فشل في تحديث المعلم" }, { status: 500 })
    }

    return NextResponse.json({ success: true, teacher: data }, { status: 200 })
  } catch (error) {
    console.error("[v0] Error in PATCH /api/teachers:", error)
    return NextResponse.json({ error: "حدث خطأ في الخادم" }, { status: 500 })
  }
}
