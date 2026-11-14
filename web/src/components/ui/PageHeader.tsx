/**
 * Page header: small kicker, serif title, optional one-line description, actions on the right.
 * A hairline rule below. On phones the actions wrap under the title.
 */
export function PageHeader({
  kicker,
  title,
  description,
  meta,
  actions,
}: {
  kicker?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Extra line under the description, e.g. time and status. */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between md:gap-8">
      <div className="min-w-0">
        {kicker ? <p className="ui-label">{kicker}</p> : null}
        <h1 className="mt-1 font-serif text-ui-xl text-ink">{title}</h1>
        {description ? <p className="mt-2 max-w-measure text-ui-sm text-ink-muted">{description}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-ui-sm text-ink-muted">{meta}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
    </header>
  );
}

/** Heading for a block inside a page: sans, medium size, optional action on the right. */
export function SectionTitle({ id, children, action }: { id?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 id={id} className="text-ui-md font-semibold text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}
