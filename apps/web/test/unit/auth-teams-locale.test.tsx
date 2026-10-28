// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { LOCALE_STORAGE_KEY, t } from "../../src/client/i18n/index.ts";
import { applyAccountLocale } from "../../src/client/pages/LoginPage.tsx";

describe("account locale", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "pt-BR";
  });

  it("uses the account locale en-US over a local pt-BR preference after login", () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, "pt-BR");
    applyAccountLocale("en-US");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("en-US");
    expect(document.documentElement.lang).toBe("en-US");
    expect(t("app.skipToMain")).toBe("Skip to main content");
  });
});
