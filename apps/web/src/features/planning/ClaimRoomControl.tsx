import { useEffect, useState } from "react";
import { useI18n } from "../../client/i18n/index.js";

interface TeamOption {
  readonly teamId: string;
  readonly name: string;
}

/**
 * Lets the host of a guest room convert it into a team room, choosing one of
 * the teams the signed-in account belongs to. Renders nothing for anyone else.
 */
export function ClaimRoomControl({ code }: { readonly code: string }) {
  const { t } = useI18n();
  const [teams, setTeams] = useState<readonly TeamOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/teams", { credentials: "include" })
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as { teams?: readonly TeamOption[] };
        if (!active || !data.teams) return;
        setTeams(data.teams);
        const first = data.teams[0];
        if (first) setTeamId(first.teamId);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  if (teams.length === 0) return null;

  async function claim() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(code)}/claim`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!response.ok) throw new Error("claim failed");
      window.location.reload();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="claim-room-title">
      <h2 id="claim-room-title">{t("claimRoom.title")}</h2>
      <label>
        {t("claimRoom.team")}
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          {teams.map((team) => (
            <option key={team.teamId} value={team.teamId}>
              {team.name}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={busy || teamId === ""} onClick={() => void claim()}>
        {t("claimRoom.button")}
      </button>
      {failed ? <p role="alert">{t("claimRoom.error")}</p> : null}
    </section>
  );
}
