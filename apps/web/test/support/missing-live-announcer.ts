import { markMissing } from "./missing-flags.js";

export function LiveAnnouncerProvider(props: { readonly children?: unknown }): unknown {
  markMissing("announcer");
  return props.children ?? null;
}

export function useLiveAnnouncer(): { announce: (message: string, politeness?: string) => void } {
  return {
    announce() {
      markMissing("announcer");
    },
  };
}
