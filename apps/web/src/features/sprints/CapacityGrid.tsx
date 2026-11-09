import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "../../client/i18n/index.js";

interface Member { readonly id: string; readonly name: string }
interface Entry { readonly personId: string; readonly absenceDays: number; readonly focusPct?: number }
export function CapacityGrid({ teamId, sprintId, entries, onSaved }: { readonly teamId: string; readonly sprintId: string; readonly entries: readonly Entry[]; readonly onSaved: () => void }) {
  const { t } = useI18n();
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [values, setValues] = useState<readonly Entry[]>(entries);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setValues(entries); }, [entries]);
  useEffect(() => {
    let active = true;
    void fetch(`/api/teams/${encodeURIComponent(teamId)}/members`, { credentials: "include" }).then(async (response) => {
      if (!response.ok) throw new Error("members failed");
      const data = await response.json() as { members: Member[] };
      if (active) setMembers(data.members);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [teamId]);
  function change(personId: string, field: "absenceDays" | "focusPct", value: number) {
    setValues((current) => {
      const prior = current.find((entry) => entry.personId === personId) ?? { personId, absenceDays: 0, focusPct: 100 };
      const fallback = field === "focusPct" ? 100 : 0;
      return [...current.filter((entry) => entry.personId !== personId), { ...prior, [field]: Number.isFinite(value) ? value : fallback }];
    });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true);
    try {
      const all = members.map((member) => values.find((entry) => entry.personId === member.id) ?? { personId: member.id, absenceDays: 0, focusPct: 100 });
      const response = await fetch(`/api/teams/${encodeURIComponent(teamId)}/sprints/${encodeURIComponent(sprintId)}/capacity`, { method: "PUT", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ entries: all }) });
      if (!response.ok) throw new Error("capacity failed");
      setError(false); onSaved();
    } catch { setError(true); } finally { setSaving(false); }
  }
  return <form onSubmit={(event) => { void submit(event); }} aria-busy={loading}>
    <h2>{t("capacityGrid.title")}</h2>
    {loading && <p role="status">{t("capacityGrid.loading")}</p>}
    {!loading && members.length === 0 && !error && <p>{t("capacityGrid.empty")}</p>}
    {error && <p role="alert">{t("capacityGrid.error")}</p>}
    <table><thead><tr><th scope="col">{t("capacityGrid.member")}</th><th scope="col">{t("capacityGrid.absence")}</th><th scope="col">{t("capacityGrid.focus")}</th></tr></thead>
      <tbody>{members.map((member) => { const entry = values.find((item) => item.personId === member.id); return <tr key={member.id}><th scope="row">{member.name}</th><td><input type="number" min="0" step="any" aria-label={t("capacityGrid.absenceFor", { name: member.name })} value={entry?.absenceDays ?? 0} onChange={(event) => change(member.id, "absenceDays", event.currentTarget.valueAsNumber)} /></td><td><input type="number" min="0" max="100" step="any" aria-label={t("capacityGrid.focusFor", { name: member.name })} value={entry?.focusPct ?? 100} onChange={(event) => change(member.id, "focusPct", event.currentTarget.valueAsNumber)} /></td></tr>; })}</tbody></table>
    <button type="submit" disabled={saving}>{t("capacityGrid.save")}</button>
  </form>;
}
