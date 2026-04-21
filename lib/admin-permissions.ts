export const PERMISSION_FALLBACKS: Record<string, string[]> = {
  "إضافة طالب": ["إدارة الطلاب"],
  "إضافة جماعية": ["إدارة الطلاب"],
  "إزالة طالب": ["إدارة الطلاب"],
  "نقل طالب": ["إدارة الطلاب"],
  "تعديل بيانات الطالب": ["إدارة الطلاب"],
  "تعديل نقاط الطالب": ["إدارة الطلاب"],
  "سجلات الطلاب": ["إدارة الطلاب"],
  "إنجازات الطلاب": ["إدارة الطلاب"],
  "خطط الطلاب": ["إدارة الطلاب"],
  "تقارير المعلمين": ["التقارير"],
  "تقارير الرسائل": ["التقارير"],
  "السجل اليومي للطلاب": ["التقارير"],
  "الإحصائيات": ["التقارير"],
  "إدارة صور خمن الصورة": ["إدارة الألعاب"],
  "إدارة أسئلة المزاد": ["إدارة الألعاب"],
  "إدارة من سيربح المليون": ["إدارة الألعاب"],
  "إدارة خلية الحروف": ["إدارة الألعاب"],
  "إدارة أسئلة الفئات": ["إدارة الألعاب"],
  "باركود الواتساب": ["الإرسال إلى أولياء الأمور"],
}

export function getPermissionCandidates(requiredPermission: string): string[] {
  return [requiredPermission, ...(PERMISSION_FALLBACKS[requiredPermission] || [])]
}

export function hasPermissionAccess(
  grantedPermissions: string[],
  requiredPermission: string,
  isFullAccess = false,
): boolean {
  if (isFullAccess || grantedPermissions.includes("all")) {
    return true
  }

  return getPermissionCandidates(requiredPermission).some((permission) => grantedPermissions.includes(permission))
}
