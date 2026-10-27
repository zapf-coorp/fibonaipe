import { AppErrorCode } from "../../../../packages/domain/src/index.js";

export const SHELL_KEYS = [
  "app.title",
  "app.subtitle",
  "app.tagline",
  "app.skipToMain",
  "header.status.connected",
  "header.status.syncing",
  "header.status.reconnecting",
  "header.theme.label",
  "header.theme.light",
  "header.theme.dark",
  "header.theme.system",
  "header.locale.label",
  "header.locale.ptBR",
  "header.locale.enUS",
  "header.locale.esES",
  "home.heroTitle",
  "home.heroSubtitle",
  "home.createRoomTitle",
  "home.createRoomDescription",
  "home.createRoomCta",
  "home.joinRoomTitle",
  "home.joinRoomDescription",
  "home.joinRoomCodeLabel",
  "home.joinRoomCodePlaceholder",
  "home.joinRoomCta",
  "home.features.suitsTitle",
  "home.features.suitsBody",
  "home.features.sprintsTitle",
  "home.features.sprintsBody",
  "home.features.privacyTitle",
  "home.features.privacyBody",
  "announcements.themeChanged",
  "announcements.localeChanged",
] as const;

export const ERROR_KEYS = [...Object.values(AppErrorCode), "SERVICE_UNAVAILABLE"].map((code) => `errors.${code}`);

export function flattenCatalog(value: unknown, prefix = ""): Record<string, string> {
  if (typeof value === "string") {
    if (!prefix) throw new Error("Catalog root must be an object");
    return { [prefix]: value };
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Catalog node ${prefix || "<root>"} must be an object or string`);
  }
  return Object.entries(value).reduce<Record<string, string>>((acc, [key, child]) => {
    const next = prefix ? `${prefix}.${key}` : key;
    return { ...acc, ...flattenCatalog(child, next) };
  }, {});
}
