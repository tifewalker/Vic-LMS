"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/marketing/Brand";
import { useMe } from "@/components/platform/RequireRole";
import { api, signOut, type Me } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ConfirmProvider } from "./ConfirmDialog";
import { ToastProvider } from "./Toast";

type NavItem = { href: string; label: string };
type NavGroup = { label: string; items: NavItem[] };

const roleLabel: Record<Me["role"], string> = { student: "Student", tutor: "Tutor", admin: "Admin", super_admin: "Super admin" };

function baseNav(me: Me): NavGroup[] {
  if (me.role === "admin" || me.role === "super_admin") {
    return [
      { label: "Overview", items: [{ href: "/admin/", label: "Dashboard" }] },
      { label: "Teaching", items: [{ href: "/admin/programmes/", label: "Programmes" }] },
      {
        label: "People",
        items: [
          { href: "/admin/users/", label: "Users" },
          { href: "/admin/users/import/", label: "Import students" },
          { href: "/admin/users/tutors/new/", label: "Add a tutor" },
          ...(me.role === "super_admin" ? [{ href: "/admin/users/admins/new/", label: "Add an admin" }] : []),
        ],
      },
    ];
  }
  if (me.role === "tutor") return [{ label: "Teaching", items: [{ href: "/tutor/", label: "Dashboard" }] }];
  return [{ label: "Learning", items: [{ href: "/student/", label: "Dashboard" }] }];
}

/** Tutors and students also get a link to each of their programmes. */
function useProgrammeLinks(me: Me): NavItem[] {
  const [links, setLinks] = useState<NavItem[]>([]);
  useEffect(() => {
    if (me.role === "tutor") {
      api<{ programmes: { id: string; title: string }[] }>("/tutor/programmes").then((r) => {
        if (r.ok) setLinks(r.data.programmes.map((p) => ({ href: `/tutor/programme/?id=${p.id}`, label: p.title })));
      });
    } else if (me.role === "student") {
      api<{ programmes: { id: string; title: string }[] }>("/student/overview").then((r) => {
        if (r.ok) setLinks(r.data.programmes.map((p) => ({ href: `/student/programme/?id=${p.id}`, label: p.title })));
      });
    }
  }, [me.role]);
  return links;
}

/** The link that best matches the current page: exact (with query) first, then the longest path prefix. */
function activeHref(items: NavItem[], pathname: string, search: string): string | null {
  const here = pathname + search;
  const exact = items.find((i) => i.href === here || (i.href.includes("?") && here.startsWith(i.href)));
  if (exact) return exact.href;
  const byPrefix = items
    .filter((i) => !i.href.includes("?") && pathname.startsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length);
  return byPrefix[0]?.href ?? null;
}

/** Works out the active link (query strings matter for programme links), then renders the nav. */
function ActiveNav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const active = activeHref(groups.flatMap((g) => g.items), pathname, search ? `?${search}` : "");
  return <Nav groups={groups} active={active} onNavigate={onNavigate} />;
}

/** useSearchParams needs a Suspense boundary in a static export. */
function SidebarNav(props: { groups: NavGroup[]; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<Nav groups={props.groups} active={null} />}>
      <ActiveNav {...props} />
    </Suspense>
  );
}

function Nav({ groups, active, onNavigate }: { groups: NavGroup[]; active: string | null; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {groups.map((g) =>
        g.items.length ? (
          <div key={g.label}>
            <p className="ui-label px-4">{g.label}</p>
            <ul className="mt-2">
              {g.items.map((item) => {
                const current = item.href === active;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={current ? "page" : undefined}
                      className={cx(
                        "block border-l-2 py-2 pr-4 pl-4 text-ui-sm leading-snug transition-colors",
                        current ? "border-accent font-semibold text-ink" : "border-transparent text-ink-muted hover:border-line hover:text-ink",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null,
      )}
    </nav>
  );
}

function Account({ me }: { me: Me }) {
  return (
    <div className="border-t border-line px-4 pt-4">
      <p className="truncate text-ui-sm font-semibold text-ink">{me.full_name}</p>
      <p className="text-ui-xs text-ink-muted">
        {roleLabel[me.role]}
        {me.tutor_id ? ` · ${me.tutor_id}` : me.matric_no ? ` · ${me.matric_no}` : ""}
      </p>
      <button type="button" onClick={() => signOut()} className="mt-3 cursor-pointer text-ui-sm font-semibold text-accent-strong underline decoration-accent/40 underline-offset-[0.22em] hover:decoration-accent-strong">
        Sign out
      </button>
    </div>
  );
}

/**
 * App frame for admin, tutor, student and class pages.
 * Wide screens: a left sidebar on paper-2 (brand, grouped links, account). Phones: a top bar
 * with a Menu drawer (a native modal dialog, so focus stays inside and Escape closes it).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const programmeLinks = useProgrammeLinks(me);
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const groups = baseNav(me);
  if (programmeLinks.length) groups.push({ label: "My programmes", items: programmeLinks });

  const closeDrawer = () => {
    drawerRef.current?.close();
    menuButtonRef.current?.focus();
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="min-h-dvh text-ui-sm lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
          <a href="#main" className="sr-only z-50 rounded-sm bg-ink px-4 py-2 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
            Skip to main content
          </a>

          {/* Desktop sidebar */}
          <aside className="hidden border-r border-line bg-paper-2 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:overflow-y-auto">
            <Link href="/" className="block px-4 pt-8 pb-8">
              <Brand stacked />
            </Link>
            <div className="flex-1">
              <SidebarNav groups={groups} />
            </div>
            <div className="pb-8">
              <Account me={me} />
            </div>
          </aside>

          {/* Phone and tablet top bar */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-paper px-4 lg:hidden">
            <Link href="/" className="min-w-0">
              <Brand />
            </Link>
            <button
              ref={menuButtonRef}
              type="button"
              aria-haspopup="dialog"
              aria-controls="app-drawer"
              onClick={() => drawerRef.current?.showModal()}
              className="h-10 shrink-0 cursor-pointer rounded-sm border border-line px-3 text-ui-sm font-semibold text-ink hover:bg-paper-2"
            >
              Menu
            </button>
          </header>

          <dialog
            id="app-drawer"
            ref={drawerRef}
            aria-label="Menu"
            onCancel={(e) => {
              e.preventDefault();
              closeDrawer();
            }}
            onClick={(e) => {
              // Clicking the backdrop closes the drawer.
              if (e.target === e.currentTarget) closeDrawer();
            }}
            className="m-0 h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none border-r border-line bg-paper-2 p-0 text-ui-sm text-ink"
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4 px-4 pt-6 pb-6">
                <Brand stacked />
                <button type="button" onClick={closeDrawer} className="h-10 cursor-pointer rounded-sm border border-line bg-paper px-3 text-ui-sm font-semibold hover:bg-paper-2" autoFocus>
                  Close
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav groups={groups} onNavigate={() => drawerRef.current?.close()} />
              </div>
              <div className="pb-6">
                <Account me={me} />
              </div>
            </div>
          </dialog>

          <main id="main" tabIndex={-1} className="min-w-0 px-4 py-8 outline-none md:px-8 lg:px-12 lg:py-12">
            <div className="mx-auto max-w-[72rem]">{children}</div>
          </main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
