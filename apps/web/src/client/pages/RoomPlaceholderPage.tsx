import { useI18n } from "../i18n/index.js";

export function RoomPlaceholderPage() {
  const { t } = useI18n();
  const code = window.location.pathname.split("/")[2] ?? "";
  return (
    <section>
      <h1>{t("app.title")}</h1>
      <p>{t("app.tagline")}</p>
      <p className="tabular-nums">{code}</p>
    </section>
  );
}
