"use client";

import { Suspense, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brand } from "@/components/marketing/Brand";
import { useMe } from "@/components/platform/RequireRole";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChartColumn,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Presentation,
  Radio,
  ShieldCheck,
  TrendingUp,
  Upload,
  type LucideIcon,
} from "lucide-react";
import { signOut, type Me } from "@/lib/api";
import { cx } from "@/lib/cx";
import { ConfirmProvider } from "./ConfirmDialog";
import { NavDataProvider, useNavData, type LiveClass, type NavData } from "./NavData";
import { ToastProvider } from "./Toast";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** A number worth acting on, e.g. work waiting to be graded. Hidden when zero. */
  count?: number;
  /** Read after the count by screen readers, e.g. "unanswered". */
  countLabel?: string;
  /** Also active on these paths (e.g. a detail page under a list). */
  also?: string[];
};
type NavGroup = { label: string; items: NavItem[] };

const roleLabel: Record<Me["role"], string> = { student: "Student", tutor: "Tutor", admin: "Admin", super_admin: "Super admin" };

function buildNav(me: Me, d: NavData): NavGroup[] {
  if (me.role === "admin" || me.role === "super_admin") {
    return [
      { label: "Overview", items: [{ href: "/admin/", label: "Overview", icon: LayoutDashboard }] },
      {
        label: "People",
        items: [
          { href: "/admin/users/?role=student", label: "Students", icon: GraduationCap },
          { href: "/admin/users/?role=tutor", label: "Tutors", icon: Presentation, also: ["/admin/users/tutors/"] },
          { href: "/admin/users/?role=admin", label: "Admins", icon: ShieldCheck, also: ["/admin/users/admins/"] },
          { href: "/admin/users/import/", label: "Import", icon: Upload },
        ],
      },
      {
        label: "Teaching",
        items: [
          { href: "/admin/programmes/", label: "Programmes", icon: BookOpen },
          { href: "/admin/classes/", label: "Classes", icon: CalendarDays, also: ["/class/"] },
          { href: "/admin/assessments/", label: "Assessments", icon: ClipboardCheck, count: d.ungraded, countLabel: "to grade", also: ["/tutor/assessment/"] },
        ],
      },
      {
        label: "Live and community",
        items: [
          { href: "/admin/live/", label: "Live monitor", icon: Radio, count: d.unanswered_live, countLabel: "unanswered" },
          { href: "/admin/discussions/", label: "Discussions", icon: MessagesSquare, count: d.unanswered_threads, countLabel: "unanswered" },
          { href: "/admin/announcements/", label: "Announcements", icon: Megaphone },
        ],
      },
      {
        label: "Reports",
        items: [
          { href: "/admin/reports/", label: "Reports", icon: ChartColumn },
          { href: "/admin/activity/", label: "Activity", icon: Activity },
        ],
      },
    ];
  }
  const programmes = (base: string): NavItem[] =>
    d.programmes.map((p) => ({ href: `${base}/programme/?id=${p.id}`, label: p.title, icon: BookOpen }));
  if (me.role === "tutor") {
    return [
      { label: "Overview", items: [{ href: "/tutor/", label: "Overview", icon: LayoutDashboard }] },
      {
        label: "Teaching",
        items: [
          { href: "/tutor/classes/", label: "Classes", icon: CalendarDays, count: d.unanswered_live, countLabel: "unanswered in live Q&A", also: ["/class/"] },
          { href: "/tutor/grading/", label: "Assessments to grade", icon: ClipboardCheck, count: d.ungraded, countLabel: "to grade", also: ["/tutor/assessment/"] },
          { href: "/tutor/discussions/", label: "Discussions", icon: MessagesSquare, count: d.unanswered_threads, countLabel: "unanswered" },
        ],
      },
      { label: "My programmes", items: programmes("/tutor") },
    ];
  }
  return [
    { label: "Overview", items: [{ href: "/student/", label: "Overview", icon: LayoutDashboard }] },
    {
      label: "Learning",
      items: [
        { href: "/student/classes/", label: "Classes", icon: CalendarDays, also: ["/class/"] },
        { href: "/student/assessments/", label: "Assessments", icon: ClipboardCheck, count: d.due, countLabel: "due" },
        { href: "/student/progress/", label: "My progress", icon: TrendingUp },
      ],
    },
    { label: "My programmes", items: programmes("/student") },
  ];
}

/** The link that best matches the current page: exact (with query) first, then the longest path prefix. */
function activeHref(items: NavItem[], pathname: string, search: string): string | null {
  const here = pathname + search;
  const exact = items.find((i) => i.href === here || (i.href.includes("?") && here.startsWith(i.href)));
  if (exact) return exact.href;
  // /admin/users/ with no role shows students.
  if (pathname === "/admin/users/" && !search) return "/admin/users/?role=student";
  const candidates = items.flatMap((i) => [i.href, ...(i.also ?? [])].filter((h) => !h.includes("?") && pathname.startsWith(h)).map((h) => ({ href: i.href, len: h.length })));
  candidates.sort((a, b) => b.len - a.len);
  return candidates[0]?.href ?? null;
}

/** Works out the active link (query strings matter for programme links), then renders the nav. */
function ActiveNav(props: { groups: NavGroup[]; live: LiveClass[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const active = activeHref(props.groups.flatMap((g) => g.items), pathname, search ? `?${search}` : "");
  const liveActive = pathname === "/class/" ? new URLSearchParams(search).get("id") : null;
  return <Nav {...props} active={active} liveActive={liveActive} />;
}

/** useSearchParams needs a Suspense boundary in a static export. */
function SidebarNav(props: { groups: NavGroup[]; live: LiveClass[]; onNavigate?: () => void }) {
  return (
    <Suspense fallback={<Nav {...props} active={null} liveActive={null} />}>
      <ActiveNav {...props} />
    </Suspense>
  );
}

const itemClass = (current: boolean) =>
  cx(
    "flex items-center gap-3 border-l-2 py-2 pr-4 pl-[calc(1rem-2px)] text-ui-sm leading-snug transition-colors",
    current ? "border-accent bg-paper font-semibold text-ink" : "border-transparent text-ink-muted hover:bg-paper/60 hover:text-ink",
  );

function Nav({
  groups,
  live,
  active,
  liveActive,
  onNavigate,
}: {
  groups: NavGroup[];
  live: LiveClass[];
  active: string | null;
  liveActive: string | null;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {live.length ? (
        <ul aria-label="Live now" className="border-y border-line bg-accent-soft/40 py-1">
          {live.slice(0, 3).map((c) => (
            <li key={c.id}>
              <Link href={`/class/?id=${c.id}`} onClick={onNavigate} aria-current={liveActive === c.id ? "page" : undefined} className={cx(itemClass(liveActive === c.id), "text-ink")}>
                <Radio aria-hidden="true" size={18} strokeWidth={1.75} className="shrink-0 text-accent-strong" />
                <span className="min-w-0">
                  <span className="block text-ui-xs font-semibold text-accent-strong">Live now</span>
                  <span className="block truncate">{c.title}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {groups.map((g) =>
        g.items.length ? (
          <div key={g.label}>
            <p className="ui-label px-4">{g.label}</p>
            <ul className="mt-2">
              {g.items.map((item) => {
                const current = item.href === active;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link href={item.href} onClick={onNavigate} aria-current={current ? "page" : undefined} className={itemClass(current)}>
                      <Icon aria-hidden="true" size={18} strokeWidth={1.75} className={cx("shrink-0", current ? "text-ink" : "text-ink-muted")} />
                      <span className="min-w-0 flex-1">{item.label}</span>
                      {item.count ? (
                        <span className="shrink-0 text-ui-xs font-semibold text-accent-strong tabular-nums">
                          {item.count}
                          <span className="sr-only"> {item.countLabel}</span>
                        </span>
                      ) : null}
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
  return (
    <NavDataProvider>
      <Shell>{children}</Shell>
    </NavDataProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const { data: nav } = useNavData();
  const drawerRef = useRef<HTMLDialogElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const groups = buildNav(me, nav);

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
              <SidebarNav groups={groups} live={nav.live} />
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
                <SidebarNav groups={groups} live={nav.live} onNavigate={() => drawerRef.current?.close()} />
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
