/** Empty state: one serif line, one line of explanation, one optional action. No illustrations. */
export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="border-y border-line py-10">
      <p className="font-serif text-ui-lg text-ink">{title}</p>
      {text ? <p className="mt-1 max-w-measure text-ui-sm text-ink-muted">{text}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
