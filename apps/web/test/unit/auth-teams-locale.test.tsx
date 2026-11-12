// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY, t } from "../../src/client/i18n/index.ts";
import { applyAccountLocale } from "../../src/client/pages/LoginPage.tsx";

describe("account locale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "pt-BR";
  });

  it("keeps the account on pt-BR while other locales are paused", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "pt-BR");
    applyAccountLocale("en-US");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(t("app.skipToMain")).toBe("Pular para o conteúdo principal");
  });
});
