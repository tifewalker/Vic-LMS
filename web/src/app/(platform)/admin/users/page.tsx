"use client";

import { useEffect, useState } from "react";
import { useMe } from "@/components/platform/RequireRole";
import { Button, ButtonLink } from "@/components/ui/Button";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { controlClass } from "@/components/ui/Field";
import { Notice } from "@/components/ui/Notice";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusLabel } from "@/components/ui/StatusLabel";
import { Tabs } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/Toast";
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

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

function readParams(): { role: Tab; status: Status } {
  if (typeof window === "undefined") return { role: "student", status: "" };
  const p = new URLSearchParams(window.location.search);
  const role = (["student", "tutor", "admin"].includes(p.get("role") ?? "") ? p.get("role") : "student") as Tab;
  const status = (["invited", "active", "suspended"].includes(p.get("status") ?? "") ? p.get("status") : "") as Status;
  return { role, status };
}

export default function UsersPage() {
  const me = useMe();
  const toast = useToast();
  const confirm = useConfirm();
  const [role, setRole] = useState<Tab>(() => readParams().role);
  const [status, setStatus] = useState<Status>(() => readParams().status);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState("");
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

  async function resend(u: User) {
    setBusy(u.invitation!.id);
    const res = await api<{ message: string }>(`/admin/invitations/${u.invitation!.id}/resend`, { method: "POST" });
    setBusy(null);
    toast(res.ok ? res.data.message : res.error, res.ok ? "success" : "error");
    load();
  }

  async function sendPending() {
    setBusy("pending");
    const res = await api<{ sent: number; failed: number; stillPending: number }>("/admin/invitations/send-pending", { method: "POST" });
    setBusy(null);
    if (res.ok) {
      toast(`Sent ${res.data.sent} invite${res.data.sent === 1 ? "" : "s"}.${res.data.failed ? ` ${res.data.failed} could not be sent.` : ""} ${res.data.stillPending} still waiting.`);
    } else toast(res.error, "error");
    load();
  }

  async function setSuspended(u: User, suspend: boolean) {
    const ok = await confirm(
      suspend
        ? { title: `Suspend ${u.full_name}?`, body: "They will be signed out straight away and cannot sign in until reactivated.", confirmLabel: "Suspend" }
        : { title: `Reactivate ${u.full_name}?`, body: "They will be able to sign in again.", confirmLabel: "Reactivate" },
    );
    if (!ok) return;
    const res = await api<{ status: string }>(`/admin/users/${u.id}/${suspend ? "suspend" : "reactivate"}`, { method: "POST" });
    toast(res.ok ? `${u.full_name} ${suspend ? "is suspended." : "is reactivated."}` : res.error, res.ok ? "success" : "error");
    load();
  }

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const canChange = (u: User) => u.id !== me.id && (u.role === "student" || u.role === "tutor" || me.role === "super_admin");
  const addAction =
    role === "student" ? (
      <ButtonLink href="/admin/users/import/">Import students</ButtonLink>
    ) : role === "tutor" ? (
      <ButtonLink href="/admin/users/tutors/new/">Add tutor</ButtonLink>
    ) : me.role === "super_admin" ? (
      <ButtonLink href="/admin/users/admins/new/">Add admin</ButtonLink>
    ) : null;
  const filtered = Boolean(search || status);

  return (
    <>
      <PageHeader
        kicker="People"
        title="Users"
        description={data ? `${data.total} ${data.total === 1 ? "person" : "people"} · ${data.emailsRemainingToday} emails left today` : "Students, tutors and admins."}
        actions={
          <>
            <Button variant="secondary" onClick={sendPending} loading={busy === "pending"} loadingText="Sending…">
              Send pending invites
            </Button>
            {addAction}
          </>
        }
      />

      <div className="mt-6">
        <Tabs
          label="User type"
          value={role}
          onChange={(t) => {
            setRole(t);
            setPage(1);
          }}
          tabs={[
            { id: "student", label: "Students" },
            { id: "tutor", label: "Tutors" },
            { id: "admin", label: "Admins" },
          ]}
        />
      </div>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(q.trim());
          setPage(1);
        }}
      >
        <label className="block min-w-0 flex-1 basis-64">
          <span className="block text-ui-sm font-semibold">Search</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={role === "student" ? "Name, email or matric number" : role === "tutor" ? "Name, email or tutor ID" : "Name or email"}
            className={cx(controlClass, "mt-2 h-11")}
          />
        </label>
        <label className="block w-full sm:w-48">
          <span className="block text-ui-sm font-semibold">Status</span>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as Status);
              setPage(1);
            }}
            className={cx(controlClass, "mt-2 h-11 cursor-pointer")}
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

      {error ? <Notice tone="error" className="mt-6">{error}</Notice> : null}

      <div className="mt-6">
        <DataTable
          caption="Users"
          rows={data?.users ?? null}
          rowKey={(u) => u.id}
          empty={
            <EmptyState
              title={filtered ? "No one matches these filters." : `No ${role === "admin" ? "admins" : `${role}s`} yet.`}
              text={filtered ? "Try a different search or status." : "People you add will appear here."}
              action={filtered ? undefined : addAction}
            />
          }
          columns={[
            {
              key: "name",
              header: "Name",
              primary: true,
              cell: (u) => (
                <>
                  <span className="block font-semibold">{u.full_name}</span>
                  <span className="block text-ui-xs break-all text-ink-muted">{u.email}</span>
                </>
              ),
            },
            ...(role !== "admin"
              ? [{ key: "id", header: role === "student" ? "Matric no." : "Tutor ID", cell: (u: User) => <span className="tabular-nums">{u.matric_no ?? u.tutor_id}</span> }]
              : []),
            {
              key: "status",
              header: "Account",
              cell: (u) => (
                <span className="inline-flex flex-col items-end gap-1 md:items-start">
                  <StatusLabel status={u.status} />
                  {u.role === "super_admin" ? <span className="text-ui-xs text-ink-muted">Super admin</span> : null}
                </span>
              ),
            },
            {
              key: "invite",
              header: "Invite",
              cell: (u) =>
                u.invitation ? (
                  <span className="inline-flex flex-col items-end gap-1 md:items-start">
                    <StatusLabel status={u.invitation.status} />
                    <span className="text-ui-xs text-ink-muted">
                      {u.invitation.attempts} {u.invitation.attempts === 1 ? "send" : "sends"}
                      {u.invitation.last_sent_at ? `, last ${fmt(u.invitation.last_sent_at)}` : ""}
                    </span>
                  </span>
                ) : (
                  <span className="text-ink-muted">None</span>
                ),
            },
            {
              key: "actions",
              header: "Actions",
              hiddenHeader: true,
              className: "md:text-right",
              cell: (u) => (
                <span className="inline-flex flex-wrap justify-end gap-x-5 gap-y-2">
                  {u.invitation && u.invitation.status !== "activated" && u.status !== "suspended" ? (
                    <Button variant="quiet" onClick={() => resend(u)} loading={busy === u.invitation.id} loadingText="Sending…">
                      Resend invite
                    </Button>
                  ) : null}
                  {canChange(u) ? (
                    <Button variant="quiet" onClick={() => setSuspended(u, u.status !== "suspended")}>
                      {u.status === "suspended" ? "Reactivate" : "Suspend"}
                    </Button>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
      </div>

      {pages > 1 ? (
        <nav aria-label="Pages" className="mt-6 flex items-center gap-4">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-ui-sm text-ink-muted">
            Page {page} of {pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </nav>
      ) : null}
    </>
  );
}
