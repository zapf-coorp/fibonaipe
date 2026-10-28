import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QrCode } from "../components/share/QrCode.js";
import { nextClientOpId } from "../connection/outbox.js";
import { useI18n, type TranslationKey } from "../i18n/index.js";
import { touchTargetStyle } from "../touch-target.js";
import styles from "./HomePage.module.css";

const SUITS: readonly TranslationKey[] = [
  "home.suits.clubs",
  "home.suits.hearts",
  "home.suits.spades",
  "home.suits.diamonds",
];

const FIBONACCI = ["1", "2", "3", "5", "8", "13"] as const;

type Phase = "landing" | "create" | "share";

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("landing");
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set(FIBONACCI));
  const [suit, setSuit] = useState(true);
  const [autoReveal, setAutoReveal] = useState(false);
  const [timer, setTimer] = useState(60);
  const [average, setAverage] = useState(true);
  const [createdCode, setCreatedCode] = useState("");
  const [qrOpen, setQrOpen] = useState(false);

  if (phase === "share") {
    const href = `/r/${createdCode}`;
    return (
      <div className={styles.stage}>
        <a href={href}>{createdCode}</a>
        <p className="tabular-nums">{createdCode}</p>
        <button
          type="button"
          style={touchTargetStyle}
          onClick={() => {
            const absolute = `${window.location.origin}${href}`;
            void navigator.clipboard?.writeText(absolute);
          }}
        >
          {t("share.copy")}
        </button>
        <button type="button" style={touchTargetStyle} onClick={() => setQrOpen(true)}>
          {t("share.showQr")}
        </button>
        {qrOpen ? (
          <div role="dialog" aria-label={t("share.qrTitle")}>
            <QrCode value={`${window.location.origin}${href}`} />
          </div>
        ) : null}
        <button
          type="button"
          style={touchTargetStyle}
          onClick={() => {
            setQrOpen(false);
            setPhase("landing");
          }}
        >
          {t("home.enterWithCode")}
        </button>
      </div>
    );
  }

  if (phase === "create") {
    return (
      <div className={styles.stage}>
        <div className={styles.form}>
          <label htmlFor="room-name">{t("create.roomName")}</label>
          <input
            id="room-name"
            aria-label={t("create.roomName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            style={touchTargetStyle}
          />
          <fieldset className={styles.cards}>
            <legend>{t("create.cards")}</legend>
            {FIBONACCI.map((card) => (
              <label key={card} style={touchTargetStyle}>
                <input
                  type="checkbox"
                  checked={selected.has(card)}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(card)) next.delete(card);
                    else next.add(card);
                    setSelected(next);
                  }}
                />
                {card}
              </label>
            ))}
          </fieldset>
          <label style={touchTargetStyle}>
            <input
              type="checkbox"
              role="switch"
              aria-label={t("create.suit")}
              checked={suit}
              onChange={(event) => setSuit(event.target.checked)}
            />
            {t("create.suit")}
          </label>
          <label style={touchTargetStyle}>
            <input
              type="checkbox"
              role="switch"
              aria-label={t("create.autoReveal")}
              checked={autoReveal}
              onChange={(event) => setAutoReveal(event.target.checked)}
            />
            {t("create.autoReveal")}
          </label>
          <label htmlFor="room-timer">{t("create.timer")}</label>
          <input
            id="room-timer"
            type="number"
            aria-label={t("create.timer")}
            value={timer}
            onChange={(event) => setTimer(Number(event.target.value))}
            style={touchTargetStyle}
          />
          <label style={touchTargetStyle}>
            <input
              type="checkbox"
              role="switch"
              aria-label={t("create.average")}
              checked={average}
              onChange={(event) => setAverage(event.target.checked)}
            />
            {t("create.average")}
          </label>
          <button
            type="button"
            style={touchTargetStyle}
            onClick={() => {
              void createRoom({
                name,
                suitAxisEnabled: suit,
                autoReveal,
                timerSeconds: timer,
                showAverage: average,
              }).then((code) => {
                if (!code) return;
                setCreatedCode(code);
                setQrOpen(false);
                setPhase("share");
              });
            }}
          >
            {t("home.createRoomCta")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <h1>{t("home.heroTitle")}</h1>
      <p>{t("home.heroSubtitle")}</p>
      <p>{t("app.subtitle")}</p>
      <p>{t("app.tagline")}</p>
      <ul className={styles.suits}>
        {SUITS.map((key) => (
          <li key={key}>{t(key)}</li>
        ))}
      </ul>
      <div className={styles.grid}>
        <section>
          <h2>{t("home.createRoomTitle")}</h2>
          <p>{t("home.createRoomDescription")}</p>
          <button type="button" style={touchTargetStyle} onClick={() => setPhase("create")}>
            {t("home.createRoomCta")}
          </button>
        </section>
        <section>
          <h2>{t("home.joinRoomTitle")}</h2>
          <p>{t("home.joinRoomDescription")}</p>
          <button type="button" style={touchTargetStyle} onClick={() => setPhase("landing")}>
            {t("home.enterWithCode")}
          </button>
          <label htmlFor="join-room-code">{t("home.joinRoomCodeLabel")}</label>
          <input
            id="join-room-code"
            aria-label={t("home.joinRoomCodeLabel")}
            placeholder={t("home.joinRoomCodePlaceholder")}
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value)}
            style={touchTargetStyle}
          />
          <button
            type="button"
            style={touchTargetStyle}
            onClick={() => {
              const code = roomCode.trim().toUpperCase();
              if (code.length !== 8) return;
              void navigate({ to: "/r/$code", params: { code } });
            }}
          >
            {t("home.joinRoomCta")}
          </button>
        </section>
      </div>
      <section>
        <h2>{t("home.features.suitsTitle")}</h2>
        <p>{t("home.features.suitsBody")}</p>
        <h2>{t("home.features.sprintsTitle")}</h2>
        <p>{t("home.features.sprintsBody")}</p>
        <h2>{t("home.features.privacyTitle")}</h2>
        <p>{t("home.features.privacyBody")}</p>
      </section>
    </div>
  );
}

async function createRoom(input: {
  readonly name: string;
  readonly suitAxisEnabled: boolean;
  readonly autoReveal: boolean;
  readonly timerSeconds: number;
  readonly showAverage: boolean;
}): Promise<string | null> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: input.name, hostNickname: "Host" }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { code?: string };
  if (typeof body.code !== "string") return null;
  const timerSeconds = Number.isInteger(input.timerSeconds) ? input.timerSeconds : null;
  await fetch(`/api/rooms/${body.code}/settings`, {
    method: "PATCH",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      clientOpId: nextClientOpId(),
      suitAxisEnabled: input.suitAxisEnabled,
      autoReveal: input.autoReveal,
      timerSeconds,
      showAverage: input.showAverage,
    }),
  });
  return body.code;
}
