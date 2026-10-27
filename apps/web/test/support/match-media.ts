export function installColorScheme(initialDark: boolean): { setDark(matches: boolean): void } {
  let dark = initialDark;
  const listeners = new Set<(event: { matches: boolean }) => void>();
  const matchMedia = (query: string) => ({
    get matches() {
      return query.includes("prefers-color-scheme: dark") ? dark : false;
    },
    media: query,
    onchange: null,
    addEventListener(_type: string, listener: (event: { matches: boolean }) => void) {
      listeners.add(listener);
    },
    removeEventListener(_type: string, listener: (event: { matches: boolean }) => void) {
      listeners.delete(listener);
    },
    addListener(listener: (event: { matches: boolean }) => void) {
      listeners.add(listener);
    },
    removeListener(listener: (event: { matches: boolean }) => void) {
      listeners.delete(listener);
    },
    dispatchEvent() {
      return true;
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: matchMedia,
  });
  return {
    setDark(matches: boolean) {
      dark = matches;
      for (const listener of [...listeners]) listener({ matches });
    },
  };
}
