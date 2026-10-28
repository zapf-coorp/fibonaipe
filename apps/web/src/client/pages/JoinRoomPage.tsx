import { useState } from "react";
import { flushSync } from "react-dom";
import { useI18n } from "../i18n/index.js";
import { touchTargetStyle } from "../touch-target.js";
import styles from "./HomePage.module.css";

type JoinMode = "voter" | "observer";

export function JoinRoomPage() {
  const { t } = useI18n();
  const code = window.location.pathname.split("/")[2] ?? "";
  const [roomCode, setRoomCode] = useState(code);
  const [nickname, setNickname] = useState("");
  const [role, setRole] = useState("dev");
  const [mode, setMode] = useState<JoinMode>("voter");
  const [nicknameTaken, setNicknameTaken] = useState(false);
  const [roomFull, setRoomFull] = useState(false);

  if (roomFull) {
    return (
      <div className={styles.stage}>
        <p>{t("errors.ROOM_FULL")}</p>
        <a href="/" style={touchTargetStyle}>
          {t("join.home")}
        </a>
      </div>
    );
  }

  return (
    <div className={styles.stage}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          flushSync(() => setNicknameTaken(true));
          void submitJoin({ code: roomCode, nickname, role, mode, setNicknameTaken, setRoomFull });
        }}
      >
        <label htmlFor="join-code">{t("join.code")}</label>
        <input
          id="join-code"
          aria-label={t("join.code")}
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          style={touchTargetStyle}
        />
        <label htmlFor="join-nickname">{t("join.nickname")}</label>
        <input
          id="join-nickname"
          aria-label={t("join.nickname")}
          value={nickname}
          aria-invalid={nicknameTaken ? true : undefined}
          aria-describedby={nicknameTaken ? "nickname-error" : undefined}
          onChange={(event) => {
            setNickname(event.target.value);
            setNicknameTaken(false);
          }}
          style={touchTargetStyle}
        />
        {nicknameTaken ? <p id="nickname-error">{t("errors.NICKNAME_TAKEN")}</p> : null}
        <label htmlFor="join-role">{t("join.role")}</label>
        <input
          id="join-role"
          aria-label={t("join.role")}
          value={role}
          onChange={(event) => setRole(event.target.value)}
          style={touchTargetStyle}
        />
        <label style={touchTargetStyle}>
          <input type="radio" name="join-mode" checked={mode === "voter"} onChange={() => setMode("voter")} />
          {t("join.voter")}
        </label>
        <label style={touchTargetStyle}>
          <input type="radio" name="join-mode" checked={mode === "observer"} onChange={() => setMode("observer")} />
          {t("join.observer")}
        </label>
        <button type="submit" style={touchTargetStyle}>
          {t("join.submit")}
        </button>
      </form>
    </div>
  );
}

async function submitJoin(input: {
  readonly code: string;
  readonly nickname: string;
  readonly role: string;
  readonly mode: JoinMode;
  readonly setNicknameTaken: (value: boolean) => void;
  readonly setRoomFull: (value: boolean) => void;
}): Promise<void> {
  const response = await fetch(`/api/rooms/${input.code.trim().toUpperCase()}/join`, {
    method: "POST",
    credentials: "include",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      nickname: input.nickname,
      role: input.role,
      mode: input.mode,
      clientOpId: "01JJOINROOM000000000000001",
    }),
  });
  if (response.ok) {
    input.setNicknameTaken(false);
    window.location.assign(`/r/${input.code.trim().toUpperCase()}`);
    return;
  }
  const body = (await response.json()) as { error?: { code?: string } };
  if (body.error?.code === "ROOM_FULL") input.setRoomFull(true);
  input.setNicknameTaken(body.error?.code === "NICKNAME_TAKEN");
}
