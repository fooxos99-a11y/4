import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireRoles } from "@/lib/auth/guards"
import { NextResponse } from "next/server"

const SETTINGS_ID = "00000000-0000-0000-0000-000000000001"

const DEFAULT_ROLES = {
  roles: ["مدير", "سكرتير", "مشرف تعليمي", "مشرف تربوي", "مشرف برامج"],
  permissions: {
    "مدير": ["all"],
    "سكرتير": [],
    "مشرف تعليمي": [],
    "مشرف تربوي": [],
    "مشرف برامج": []
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("programs")
      .select("description")
      .eq("id", SETTINGS_ID)
      .maybeSingle()

    if (error) {
      return NextResponse.json(DEFAULT_ROLES)
    }

    if (data && data.description) {
      try {
        const parsed = JSON.parse(data.description)
        return NextResponse.json({
          roles: parsed.roles || DEFAULT_ROLES.roles,
          permissions: parsed.permissions || DEFAULT_ROLES.permissions
        })
      } catch (e) {
        return NextResponse.json(DEFAULT_ROLES)
      }
    }

    return NextResponse.json(DEFAULT_ROLES)
  } catch (e) {
    return NextResponse.json(DEFAULT_ROLES)
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const supabase = createAdminClient()
    const body = await request.json()
    
    // Upsert into programs
    const { error } = await supabase
      .from("programs")
      .upsert({
        id: SETTINGS_ID,
        name: 'ROLES_SETTINGS',
        is_active: true,
        date: 'settings',
        duration: 'settings',
        points: 0,
        description: JSON.stringify(body)
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireRoles(request, ["admin", "supervisor"])
    if ("response" in auth) {
      return auth.response
    }

    const body = await request.json()
    const oldRole = String(body.oldRole || "").trim()
    const newRole = String(body.newRole || "").trim()

    if (!oldRole || !newRole) {
      return NextResponse.json({ error: "المسمى القديم والجديد مطلوبان" }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("programs")
      .select("description")
      .eq("id", SETTINGS_ID)
      .maybeSingle()

    if (error) {
      throw error
    }

    const parsed = data?.description ? JSON.parse(data.description) : DEFAULT_ROLES
    const currentRoles = Array.isArray(parsed.roles) ? parsed.roles : DEFAULT_ROLES.roles
    const currentPermissions = parsed.permissions && typeof parsed.permissions === "object"
      ? parsed.permissions
      : DEFAULT_ROLES.permissions

    if (!currentRoles.includes(oldRole)) {
      return NextResponse.json({ error: "المسمى القديم غير موجود" }, { status: 404 })
    }

    if (oldRole !== newRole && currentRoles.includes(newRole)) {
      return NextResponse.json({ error: "المسمى الجديد موجود مسبقاً" }, { status: 400 })
    }

    const updatedRoles = currentRoles.map((role: string) => (role === oldRole ? newRole : role))
    const updatedPermissions = { ...currentPermissions }
    updatedPermissions[newRole] = updatedPermissions[oldRole] || []
    if (oldRole !== newRole) {
      delete updatedPermissions[oldRole]
    }

    const { error: settingsError } = await supabase
      .from("programs")
      .upsert({
        id: SETTINGS_ID,
        name: "ROLES_SETTINGS",
        is_active: true,
        date: "settings",
        duration: "settings",
        points: 0,
        description: JSON.stringify({ roles: updatedRoles, permissions: updatedPermissions }),
      })

    if (settingsError) {
      throw settingsError
    }

    if (oldRole !== newRole) {
      const { error: usersError } = await supabase
        .from("users")
        .update({ role: newRole })
        .eq("role", oldRole)

      if (usersError) {
        throw usersError
      }
    }

    return NextResponse.json({ success: true, roles: updatedRoles, permissions: updatedPermissions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
