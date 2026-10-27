const missing = "Missing implementation: apps/web/src/client/providers/theme-provider.tsx";

export function ThemeProvider(_props: { readonly children?: unknown }): never {
  throw new Error(missing);
}

export function useTheme(): never {
  throw new Error(missing);
}
