import { expect } from "vitest";

expect.extend({
  toHaveAttribute(received: Element, name: string, value?: string) {
    const actual = received.getAttribute(name);
    const pass = value === undefined ? actual !== null : actual === value;
    return {
      pass,
      message: () => `expected attribute ${name} to be ${String(value)}, received ${String(actual)}`,
    };
  },
  toHaveAccessibleDescription(received: Element, expected: string) {
    const owner = received.ownerDocument;
    const described = received
      .getAttribute("aria-describedby")
      ?.split(/\s+/)
      .map((id) => owner.getElementById(id)?.textContent ?? "")
      .join(" ")
      .trim();
    const text = described && described.length > 0 ? described : (received.getAttribute("aria-description") ?? "");
    const pass = text === expected;
    return {
      pass,
      message: () => `expected accessible description "${expected}", received "${text}"`,
    };
  },
});
