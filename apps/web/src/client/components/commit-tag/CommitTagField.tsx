import { useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import styles from "./CommitTagField.module.css";

export function CommitTagField({
  value,
  onChange,
  suggestions,
  label,
  placeholder,
  addLabel,
  maxLength = 80,
}: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly suggestions: readonly string[];
  readonly label: string;
  readonly placeholder: string;
  readonly addLabel: (name: string) => string;
  readonly maxLength?: number;
}) {
  const [editing, setEditing] = useState(value.trim().length === 0);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const focusWhenShown = useRef(false);
  const listId = useId();
  const typed = draft.trim();
  const folded = typed.toLowerCase();
  const matches = suggestions.filter((name) => folded.length === 0 || name.toLowerCase().includes(folded));
  const exact = suggestions.some((name) => name.toLowerCase() === folded);

  useEffect(() => {
    if (!editing || !focusWhenShown.current) return;
    focusWhenShown.current = false;
    inputRef.current?.focus();
  }, [editing]);

  function resolve(raw: string): string {
    const text = raw.trim();
    if (text.length === 0) return "";
    const key = text.toLowerCase();
    const exactName = suggestions.find((name) => name.toLowerCase() === key);
    if (exactName) return exactName;
    const hits = suggestions.filter((name) => name.toLowerCase().includes(key));
    if (hits.length === 1) return hits[0] ?? text;
    return text;
  }

  function commit(name: string) {
    const next = name.trim();
    if (next.length === 0) {
      setOpen(false);
      return;
    }
    flushSync(() => {
      onChange(next);
      setDraft("");
      setOpen(false);
      setEditing(false);
    });
  }

  function clear() {
    focusWhenShown.current = true;
    flushSync(() => {
      onChange("");
      setDraft("");
      setEditing(true);
      setOpen(true);
    });
  }

  if (!editing && value.trim().length > 0) {
    return (
      <div className={styles.field}>
        <button type="button" onClick={clear}>
          {value}
        </button>
      </div>
    );
  }

  const showSuggestions = open && (matches.length > 0 || (typed.length > 0 && !exact));

  return (
    <div className={styles.field}>
      <input
        ref={inputRef}
        aria-label={label}
        placeholder={placeholder}
        maxLength={maxLength}
        value={draft}
        aria-expanded={showSuggestions}
        aria-controls={showSuggestions ? listId : undefined}
        onFocus={() => setOpen(true)}
        onBlur={() => commit(resolve(draft))}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commit(resolve(draft));
        }}
      />
      {showSuggestions ? (
        <ul id={listId} className={styles.suggestions}>
          {matches.map((name) => (
            <li key={name}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(name)}>
                {name}
              </button>
            </li>
          ))}
          {typed.length > 0 && !exact ? (
            <li>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => commit(typed)}>
                {addLabel(typed)}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
