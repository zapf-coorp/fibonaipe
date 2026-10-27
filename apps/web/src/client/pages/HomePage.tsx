import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useI18n, type TranslationKey } from "../i18n/index.js";
import { touchTargetStyle } from "../touch-target.js";
import styles from "./HomePage.module.css";

const SUITS: readonly TranslationKey[] = [
  "home.suits.clubs",
  "home.suits.hearts",
  "home.suits.spades",
  "home.suits.diamonds",
];

export function HomePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
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
          <button type="button" style={touchTargetStyle}>
            {t("home.createRoomCta")}
          </button>
        </section>
        <section>
          <h2>{t("home.joinRoomTitle")}</h2>
          <p>{t("home.joinRoomDescription")}</p>
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
