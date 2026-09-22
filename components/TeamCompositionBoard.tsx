"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { OrgChart } from "./OrgChart";
import { notifyTeamRosterChanged, useTeamRoster } from "./TeamRosterProvider";
import { parseExtraMemberRosterId, personInitials, type ExtraRosterMember, type TeamPerson } from "@/lib/team-roster";
import type { TeamKey } from "@/lib/types";

type TeamCompositionBoardProps = {
  team: TeamKey;
};

export function TeamCompositionBoard({ team }: TeamCompositionBoardProps) {
  const { extras, rosterFor, replaceExtras } = useTeamRoster();
  const roster = useMemo(() => rosterFor(team), [rosterFor, team]);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("Team Member");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [statusError, setStatusError] = useState(false);

  function onPhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    setPhotoFile(file);
    setPhotoPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return file ? URL.createObjectURL(file) : "";
    });
  }

  function clearPhoto() {
    setPhotoFile(null);
    setPhotoPreview((current) => {
      if (current.startsWith("blob:")) URL.revokeObjectURL(current);
      return "";
    });
  }

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setStatusError(true);
      setStatus("Enter the member's name.");
      return;
    }
    setSaving(true);
    setStatus("");
    setStatusError(false);
    try {
      const body = new FormData();
      body.append("team", team);
      body.append("name", trimmed);
      body.append("title", title.trim() || "Team Member");
      if (photoFile) body.append("file", photoFile);
      const response = await fetch("/api/team-roster", { method: "POST", body });
      const data = (await response.json().catch(() => ({}))) as { members?: ExtraRosterMember[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not add this team member.");
      replaceExtras(data.members ?? extras);
      notifyTeamRosterChanged();
      setName("");
      setTitle("Team Member");
      clearPhoto();
      setStatus(`${trimmed} is now on the ${roster.label} default member list.`);
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not add this team member.");
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(person: TeamPerson) {
    const parsed = person.id ? parseExtraMemberRosterId(person.id) : null;
    if (!parsed) return;
    setSaving(true);
    setStatus("");
    setStatusError(false);
    try {
      const response = await fetch(`/api/team-roster?id=${encodeURIComponent(parsed.id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => ({}))) as { members?: ExtraRosterMember[]; error?: string };
      if (!response.ok) throw new Error(data.error || "Could not remove this team member.");
      replaceExtras(data.members ?? extras);
      notifyTeamRosterChanged();
      setStatus(`${person.name} was removed from the default member list.`);
    } catch (error) {
      setStatusError(true);
      setStatus(error instanceof Error ? error.message : "Could not remove this team member.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <OrgChart
        roster={roster}
        onRemoveExtra={onRemove}
        extraSlot={
          <form className="org-card org-add-card" style={{ borderTopColor: roster.color }} onSubmit={onAdd}>
            <label className="org-add-photo" style={{ boxShadow: `0 0 0 3px ${roster.color}` }}>
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="" className="org-photo" />
              ) : (
                <span className="org-add-photo-empty">
                  {name.trim() ? personInitials(name) : "+ Photo"}
                </span>
              )}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPhotoChange} />
            </label>
            {photoPreview ? (
              <button type="button" className="org-add-photo-clear" onClick={clearPhoto}>
                Remove photo
              </button>
            ) : (
              <p className="org-add-hint">Attach a profile picture</p>
            )}
            <label className="org-add-field">
              <span>Full name</span>
              <input
                type="text"
                value={name}
                placeholder="Type a name"
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="org-add-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                placeholder="Team Member"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <button type="submit" className="admin-btn admin-btn-primary org-add-submit" disabled={saving || !name.trim()}>
              {saving ? "Adding…" : "Add team member"}
            </button>
          </form>
        }
      />
      {status ? <p className={`org-add-status${statusError ? " is-error" : ""}`}>{status}</p> : null}
    </>
  );
}
