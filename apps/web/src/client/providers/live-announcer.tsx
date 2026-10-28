import { flushSync } from "react-dom";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

export type Politeness = "polite" | "assertive";

const DEBOUNCE_MS = 150;

interface LiveAnnouncerContextValue {
  readonly announce: (message: string, politeness?: Politeness) => void;
}

const LiveAnnouncerContext = createContext<LiveAnnouncerContextValue | null>(null);

export function LiveAnnouncerProvider({ children }: { readonly children: ReactNode }) {
  const [polite, setPolite] = useState<[string, string]>(["", ""]);
  const [assertive, setAssertive] = useState("");
  const slot = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string, politeness: Politeness = "polite") => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      flushSync(() => {
        if (politeness === "assertive") {
          setAssertive(message);
          return;
        }
        const next = slot.current === 0 ? 1 : 0;
        slot.current = next;
        setPolite(() => {
          const updated: [string, string] = ["", ""];
          updated[next] = message;
          return updated;
        });
      });
    }, DEBOUNCE_MS);
  }, []);

  const value = useMemo<LiveAnnouncerContextValue>(() => ({ announce }), [announce]);

  return (
    <LiveAnnouncerContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={polite[0] ? undefined : true}
        className="sr-only"
      >
        {polite[0]}
      </div>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-hidden={polite[1] ? undefined : true}
        className="sr-only"
      >
        {polite[1]}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {assertive}
      </div>
    </LiveAnnouncerContext.Provider>
  );
}

export function useLiveAnnouncer(): LiveAnnouncerContextValue {
  const value = useContext(LiveAnnouncerContext);
  if (!value) throw new Error("useLiveAnnouncer must be used within LiveAnnouncerProvider");
  return value;
}
