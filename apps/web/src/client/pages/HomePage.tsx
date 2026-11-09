import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { QrCode } from "../components/share/QrCode.js";
import { nextClientOpId } from "../connection/outbox.js";
import { useI18n, type TranslationKey } from "../i18n/index.js";
import { touchTargetStyle } from "../touch-target.js";
import styles from "./HomePage.module.css";

const SUITS: readonly { readonly key: TranslationKey; readonly suit: string }[] = [
  { key: "home.suits.clubs", suit: "clubs" },
  { key: "home.suits.hearts", suit: "hearts" },
  { key: "home.suits.spades", suit: "spades" },
  { key: "home.suits.diamonds", suit: "diamonds" },
];

const FAN = ["heart", "spade", "queen", "back", "mystery"] as const;

const FIBONACCI = ["1", "2", "3", "5", "8", "13", "21", "34", "55"] as const;

type Phase = "landing" | "create" | "share";

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("landing");
  const [roomCode, setRoomCode] = useState("");
  const [name, setName] = useState("");
  const [hostName, setHostName] = useState("");
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
        <div className={styles.sheet + " surface"}>
        <a href={href}>{createdCode}</a>
        <p className={styles.code + " surface tabular-nums"}>{createdCode}</p>
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
      </div>
    );
  }

  if (phase === "create") {
    return (
      <div className={styles.stage}>
        <div className={styles.form + " surface"}>
          <label htmlFor="host-name">{t("create.hostName")}</label>
          <input
            id="host-name"
            aria-label={t("create.hostName")}
            value={hostName}
            onChange={(event) => setHostName(event.target.value)}
            style={touchTargetStyle}
          />
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
                hostName,
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

  const titleWords = t("home.heroTitle").split(" ");
  return (
    <div className={styles.stage}>
      <div className={styles.hero}>
        <div className={styles.fan} aria-hidden="true">
          {FAN.map((face) => (
            <span key={face} className={styles.fanCard} data-face={face} />
          ))}
        </div>
        <h1 className="surface">
          <span className="sr-only">{t("home.heroTitle")}</span>
          <span className={styles.tiles} aria-hidden="true">
            {titleWords.map((word, index) => (
              <span key={`${word}-${index}`} className={styles.tile}>
                {word}
              </span>
            ))}
          </span>
        </h1>
        <p className={styles.ribbon + " surface"}>{t("home.heroSubtitle")}</p>
        <div className={styles.pitch}>
          <p className={styles.lede}>
            {t("app.subtitle")}
            <br />
            {t("app.tagline")}
          </p>
          <ul className={styles.suits}>
            {SUITS.map((item) => (
              <li key={item.key} className={styles.suitCard + " surface"} data-suit={item.suit}>
                {t(item.key)}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={styles.grid}>
        <section className={styles.panel + " surface"}>
          <h2>{t("home.createRoomTitle")}</h2>
          <p>{t("home.createRoomDescription")}</p>
          <button type="button" style={touchTargetStyle} onClick={() => setPhase("create")}>
            {t("home.createRoomCta")}
          </button>
        </section>
        <section className={styles.panel + " surface"}>
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
      <section className={styles.features}>
        <article className={styles.feature + " surface"}>
          <h2>{t("home.features.suitsTitle")}</h2>
          <p>{t("home.features.suitsBody")}</p>
        </article>
        <article className={styles.feature + " surface"}>
          <h2>{t("home.features.sprintsTitle")}</h2>
          <p>{t("home.features.sprintsBody")}</p>
        </article>
        <article className={styles.feature + " surface"}>
          <h2>{t("home.features.privacyTitle")}</h2>
          <p>{t("home.features.privacyBody")}</p>
        </article>
      </section>
    </div>
  );
}

async function createRoom(input: {
  readonly name: string;
  readonly hostName: string;
  readonly suitAxisEnabled: boolean;
  readonly autoReveal: boolean;
  readonly timerSeconds: number;
  readonly showAverage: boolean;
}): Promise<string | null> {
  const response = await fetch("/api/rooms", {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: input.name, hostNickname: input.hostName.trim() || "Convidado" }),
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
