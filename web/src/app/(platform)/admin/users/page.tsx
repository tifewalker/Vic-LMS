"use client";

import { useEffect, useState } from "react";
import { ConfirmButton } from "@/components/platform/ConfirmButton";
import { useMe } from "@/components/platform/RequireRole";
import { Button, buttonClass, Notice, PageTitle } from "@/components/platform/ui";
import { api } from "@/lib/api";
import { cx } from "@/lib/cx";

type Tab = "student" | "tutor" | "admin";
type Status = "" | "invited" | "active" | "suspended";

type User = {
  id: string;
  role: string;
  full_name: string;
  email: string;
  status: "invited" | "active" | "suspended";
  matric_no: string | null;
  tutor_id: string | null;
  invitation: { id: string; status: string; attempts: number; last_sent_at: string | null } | null;
};
type ListResponse = { users: User[]; total: number; page: number; pageSize: number; emailsRemainingToday: number };

const tabs: { id: Tab; label: string }[] = [
  { id: "student", label: "Students" },
  { id: "tutor", label: "Tutors" },
  { id: "admin", label: "Admins" },
];

const statusLabel: Record<User["status"], string> = { invited: "Not activated", active: "Active", suspended: "Suspended" };
const inviteLabel: Record<string, string> = {
  pending: "Waiting to send",
  sent: "Sent",
  activated: "Activated",
  expired: "Expired",
};

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

function readParams(): { role: Tab; status: Status } {
  if (typeof window === "undefined") return { role: "student", status: "" };
  const p = new URLSearchParams(window.location.search);
  const role = (["student", "tutor", "admin"].includes(p.get("role") ?? "") ? p.get("role") : "student") as Tab;
  const status = (["invited", "active", "suspended"].includes(p.get("status") ?? "") ? p.get("status") : "") as Status;
  return { role, status };
}

export default function UsersPage() {
  const me = useMe();
  const [role, setRole] = useState<Tab>(() => readParams().role);
  const [status, setStatus] = useState<Status>(() => readParams().status);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ role, page: String(page) });
    if (status) params.set("status", status);
    if (search) params.set("q", search);
    api<ListResponse>(`/admin/users?${params}`).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setData(res.data);
        setError("");
      } else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [role, status, search, page, reloadKey]);

  async function resend(invitationId: string) {
    setBusy(invitationId);
    const res = await api<{ message: string }>(`/admin/invitations/${invitationId}/resend`, { method: "POST" });
    setBusy(null);
    setNotice(res.ok ? res.data.message : res.error);
    load();
  }

  async function setSuspended(u: User, suspend: boolean) {
    const res = await api<{ status: string }>(`/admin/users/${u.id}/${suspend ? "suspend" : "reactivate"}`, { method: "POST" });
    setNotice(res.ok ? `${u.full_name} ${suspend ? "is suspended and cannot sign in." : "is reactivated."}` : res.error);
    load();
  }

  async function sendPending() {
    setBusy("pending");
    const res = await api<{ sent: number; failed: number; stillPending: number }>("/admin/invitations/send-pending", {
      method: "POST",
    });
    setBusy(null);
    setNotice(
      res.ok
        ? `Sent ${res.data.sent} invite${res.data.sent === 1 ? "" : "s"}.${res.data.failed ? ` ${res.data.failed} could not be sent.` : ""} ${res.data.stillPending} still waiting.`
        : res.error,
    );
    load();
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <PageTitle title="Users">
        <Button variant="secondary" onClick={sendPending} disabled={busy === "pending"}>
          {busy === "pending" ? "Sending…" : "Send pending invites"}
        </Button>
        {role === "student" ? (
          <a href="/admin/users/import/" className={buttonClass()}>
            Import students
          </a>
        ) : role === "tutor" ? (
          <a href="/admin/users/tutors/new/" className={buttonClass()}>
            Add tutor
          </a>
        ) : me.role === "super_admin" ? (
          <a href="/admin/users/admins/new/" className={buttonClass()}>
            Add admin
          </a>
        ) : null}
      </PageTitle>

      <div role="tablist" aria-label="User type" className="mt-6 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={role === t.id}
            onClick={() => {
              setRole(t.id);
              setPage(1);
            }}
            className={cx(
              "-mb-px cursor-pointer border-b-2 pb-2.5 text-[0.9375rem]",
              role === t.id ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <label className="block min-w-0 flex-1 basis-60">
          <span className="block text-sm font-semibold">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={role === "student" ? "Name, email or matric number" : role === "tutor" ? "Name, email or tutor ID" : "Name or email"}
            className="mt-1 block w-full rounded-sm border border-line bg-white px-3 py-2 text-base"
          />
        </label>
        <label className="block">
          <span className="block text-sm font-semibold">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status);
              setPage(1);
            }}
            className="mt-1 block rounded-sm border border-line bg-white px-3 py-2 text-base"
          >
            <option value="">All</option>
            <option value="invited">Not activated</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mt-6 space-y-3">
        {notice ? <Notice>{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
      </div>

      {data ? (
        <p className="mt-6 text-sm text-ink-muted">
          {data.total} {data.total === 1 ? "person" : "people"}. Emails left today: {data.emailsRemainingToday}.
        </p>
      ) : null}

      <div className="relative mt-3 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[0.9375rem]">
          <thead>
            <tr className="border-y border-line text-sm text-ink-muted">
              <th className="py-2.5 pr-4 font-semibold">Name</th>
              {role !== "admin" ? <th className="py-2.5 pr-4 font-semibold">{role === "student" ? "Matric no." : "Tutor ID"}</th> : null}
              <th className="py-2.5 pr-4 font-semibold">Status</th>
              <th className="py-2.5 pr-4 font-semibold">Invite</th>
              <th className="py-2.5 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <span className="block">{u.full_name}</span>
                  <span className="block text-sm text-ink-muted">{u.email}</span>
                </td>
                {role !== "admin" ? <td className="py-3 pr-4 tabular-nums">{u.matric_no ?? u.tutor_id}</td> : null}
                <td className="py-3 pr-4">
                  {statusLabel[u.status]}
                  {u.role === "super_admin" ? <span className="block text-sm text-ink-muted">Super admin</span> : null}
                </td>
                <td className="py-3 pr-4 text-sm">
                  {u.invitation ? (
                    <>
                      <span className="block">{inviteLabel[u.invitation.status] ?? u.invitation.status}</span>
                      <span className="block text-ink-muted">
                        {u.invitation.attempts} {u.invitation.attempts === 1 ? "send" : "sends"}
                        {u.invitation.last_sent_at ? `, last ${fmt(u.invitation.last_sent_at)}` : ""}
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-muted">None</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <div className="flex flex-col items-end gap-2">
                    {u.invitation && u.invitation.status !== "activated" && u.status !== "suspended" ? (
                      <Button variant="quiet" onClick={() => resend(u.invitation!.id)} disabled={busy === u.invitation.id}>
                        {busy === u.invitation.id ? "Sending…" : "Resend invite"}
                      </Button>
                    ) : null}
                    {u.id === me.id || (u.role !== "student" && u.role !== "tutor" && me.role !== "super_admin") ? null : u.status === "suspended" ? (
                      <ConfirmButton
                        label="Reactivate"
                        question={`Let ${u.full_name.split(" ")[0]} sign in again?`}
                        confirmLabel="Reactivate"
                        onConfirm={() => setSuspended(u, false)}
                      />
                    ) : (
                      <ConfirmButton
                        label="Suspend"
                        question={`Suspend ${u.full_name.split(" ")[0]}? They will be signed out.`}
                        confirmLabel="Suspend"
                        onConfirm={() => setSuspended(u, true)}
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {data && data.users.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-ink-muted">
                  No one matches these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {pages > 1 ? (
        <div className="mt-6 flex items-center gap-4 text-[0.9375rem]">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-ink-muted">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      ) : null}
    </>
  );
}
