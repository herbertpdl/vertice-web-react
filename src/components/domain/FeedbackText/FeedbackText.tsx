/**
 * A feedback's comment in quotes, or "Sem comentário" when the client only rated the workout
 * (R2: the comment is optional since ratings).
 */
export function FeedbackText({ text }: { text: string }) {
  const comment = text.trim();
  if (comment === "") {
    return (
      <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-tertiary)] italic">
        Sem comentário
      </p>
    );
  }
  return (
    <p className="text-[length:var(--text-base)] leading-[1.5] text-[color:var(--color-text-secondary)]">
      &ldquo;{comment}&rdquo;
    </p>
  );
}
