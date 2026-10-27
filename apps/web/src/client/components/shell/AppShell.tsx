import { Outlet, useRouterState } from "@tanstack/react-router";
import { useI18n } from "../../i18n/index.js";
import { touchTargetStyle } from "../../touch-target.js";
import { AppHeader } from "./AppHeader.js";

function focusMain(event: { preventDefault(): void }): void {
  event.preventDefault();
  const main = document.getElementById("main-stage");
  if (main instanceof HTMLElement) main.focus();
}

export function AppShell() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const projector = pathname.endsWith("/screen") || window.location.pathname.endsWith("/screen");
  return (
    <>
      <a href="#main-stage" className="skip-link" style={touchTargetStyle} onClick={focusMain}>
        {t("app.skipToMain")}
      </a>
      {projector ? null : <AppHeader />}
      <main id="main-stage" tabIndex={-1}>
        <Outlet />
      </main>
    </>
  );
}
