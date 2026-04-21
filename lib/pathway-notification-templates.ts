export const PATHWAY_LEVEL_NOTIFICATION_SETTINGS_ID = "pathway_level_notification_templates"

export type PathwayLevelNotificationTemplates = {
  publish: string
}

export const DEFAULT_PATHWAY_LEVEL_NOTIFICATION_TEMPLATES: PathwayLevelNotificationTemplates = {
  publish: "تم إتاحة مسار جديد لك في حلقة {halaqah}: {levelTitle}.",
}

export function normalizePathwayLevelNotificationTemplates(value: unknown): PathwayLevelNotificationTemplates {
  const candidate = value && typeof value === "object" ? value as Partial<PathwayLevelNotificationTemplates> : {}

  return {
    publish: typeof candidate.publish === "string" && candidate.publish.trim()
      ? candidate.publish.trim()
      : (typeof (candidate as { create?: string }).create === "string" && (candidate as { create?: string }).create?.trim()
          ? String((candidate as { create?: string }).create).trim()
          : DEFAULT_PATHWAY_LEVEL_NOTIFICATION_TEMPLATES.publish),
  }
}

export function fillPathwayLevelNotificationTemplate(
  template: string,
  params: {
    halaqah?: string | null
    levelTitle: string
    levelNumber: number
  },
) {
  return template
    .replaceAll("{halaqah}", params.halaqah || "")
    .replaceAll("{levelTitle}", params.levelTitle)
    .replaceAll("{levelNumber}", String(params.levelNumber))
}