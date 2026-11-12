import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";
import { touchTargetStyle } from "../../client/touch-target.js";
import { useAccount } from "../auth/account.js";
import { TeamDialog } from "./TeamDialog.js";
import { readJson, ROLE_KEYS, sendAction, type MemberRow, type TeamRow } from "./team-shared.js";
import styles from "./TeamsPage.module.css";

export function MembersModal({
  team,
  roleLabel,
  onClose,
  onChanged,
  onError,
}: {
  readonly team: TeamRow;
  readonly roleLabel: string;
  readonly onClose: () => void;
  readonly onChanged: () => void;
  readonly onError: () => void;
}) {
  const { t } = useI18n();
  const { user } = useAccount();
  const [members, setMembers] = useState<readonly MemberRow[]>([]);
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [version, setVersion] = useState(0);
  const owner = team.role === "teamAdmin";
  const titleId = `members-${team.teamId}`;

  useEffect(() => {
    let active = true;
    void fetch(`/api/teams/${encodeURIComponent(team.teamId)}/members`, { credentials: "include" }).then(async (response) => {
      if (!active) return;
      if (!response.ok) {
        onError();
        return;
      }
      const data = await readJson<{ members?: readonly MemberRow[] }>(response);
      setMembers(data.members ?? []);
    });
    return () => {
      active = false;
    };
  }, [onError, team.teamId, version]);

  async function addMember(event: FormEvent) {
    event.preventDefault();
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/members`, {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!response.ok) onError();
    else {
      setEmail("");
      setVersion((current) => current + 1);
    }
  }

  async function copyLink() {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/invites`, {
      method: "POST",
      credentials: "include",
    });
    if (!response.ok) {
      onError();
      return;
    }
    const data = await readJson<{ link?: string }>(response);
    if (data.link) {
      try { await navigator.clipboard.writeText(data.link); } catch { /* the notice still shows the link */ }
    }
    setNotice(data.link ? `${t("teams.invited")}: ${data.link}` : t("teams.invited"));
  }

  async function remove(userId: string) {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}/members/${encodeURIComponent(userId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) onError();
    else setVersion((current) => current + 1);
  }

  async function removeTeam() {
    const response = await sendAction(`/api/teams/${encodeURIComponent(team.teamId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) onError();
    else {
      onClose();
      onChanged();
    }
  }

  return (
    <TeamDialog titleId={titleId} title={t("teams.membersOf", { name: team.name })} onClose={onClose}>
      <p className={styles.subhead}>{user?.displayName ?? team.name} — {roleLabel}</p>
      <form className={styles.inviteRow} onSubmit={(event) => { void addMember(event); }}>
        <input
          type="email"
          required
          aria-label={t("teams.email")}
          placeholder={t("teams.email")}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className={styles.iconButton} style={touchTargetStyle} aria-label={t("teams.send")}>
          <ChevronIcon />
        </button>
        <button type="button" className={styles.linkButton} onClick={() => { void copyLink(); }}>{t("teams.copyLink")}</button>
      </form>
      {notice ? <p role="status">{notice}</p> : null}
      <ul className={styles.plainList}>
        {members.map((member) => (
          <li key={member.id} className={styles.memberRow}>
            <span>{member.name}</span>
            <span className={styles.role}>{t(ROLE_KEYS[member.role] ?? "teams.roles.observer")}</span>
            {owner && member.id !== user?.userId ? (
              <button type="button" style={touchTargetStyle} onClick={() => { void remove(member.id); }}>{t("teams.remove")}</button>
            ) : null}
          </li>
        ))}
      </ul>
      {owner ? (
        <button type="button" className={styles.textButton} onClick={() => { void removeTeam(); }}>{t("teams.delete")}</button>
      ) : null}
    </TeamDialog>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M8 5l8 7-8 7" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}
