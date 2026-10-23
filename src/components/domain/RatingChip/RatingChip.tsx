import type { FeedbackRating } from "@/lib/api/types";
import { ratingLabels } from "@/lib/feedback";

import { EMOJI_ART } from "./emojiArt";

/** The client's face for a rating (the app's M Emoji artwork, 48×48 viewBox), decorative. */
function RatingEmoji({ rating, size }: { rating: FeedbackRating; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      {EMOJI_ART[rating].map((shape, i) =>
        shape.kind === "ellipse" ? (
          <ellipse
            key={i}
            cx={shape.cx}
            cy={shape.cy}
            rx={shape.rx}
            ry={shape.ry}
            fill={shape.fill}
            transform={"transform" in shape ? shape.transform : undefined}
          />
        ) : (
          <path
            key={i}
            d={shape.d}
            transform={shape.transform}
            fill={"fill" in shape ? shape.fill : "none"}
            stroke={"stroke" in shape ? shape.stroke : undefined}
            strokeWidth={"strokeWidth" in shape ? shape.strokeWidth : undefined}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
    </svg>
  );
}

/**
 * The client's rating of the workout on a feedback (M Rating Chip, design frame `YICJ0`): the
 * face and its label on a `surface-active` pill.
 */
export function RatingChip({ rating }: { rating: FeedbackRating }) {
  return (
    <span
      className="font-base inline-flex w-fit items-center gap-[6px] rounded-[var(--radius-full)] bg-[var(--color-surface-active)] py-[3px] pr-[10px] pl-[4px] text-[12px] font-semibold text-[color:var(--color-text-primary)]"
      aria-label={`Avaliação: ${ratingLabels[rating]}`}
      role="img"
    >
      <RatingEmoji rating={rating} size={20} />
      <span aria-hidden="true">{ratingLabels[rating]}</span>
    </span>
  );
}

/** "Sessão substituída": the client redid this session and the redo replaced it (R3). */
export function ReplacedSessionTag() {
  return (
    <span className="font-base inline-flex w-fit items-center rounded-[var(--radius-full)] border border-[var(--color-border-strong)] px-[10px] py-[3px] text-[length:var(--text-xs)] font-semibold text-[color:var(--color-text-secondary)]">
      Sessão substituída
    </span>
  );
}
