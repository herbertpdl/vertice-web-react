import type { FeedbackRating } from "@/lib/api/types";

/** Hardest first, as the client's scale shows them. */
export const RATING_ORDER: FeedbackRating[] = ["VERY_HARD", "HARD", "JUST_RIGHT", "EASY", "VERY_EASY"];

/** The client's rating of a workout, as the app labels it (vertice-mobile's `RATINGS`). */
export const ratingLabels: Record<FeedbackRating, string> = {
  VERY_HARD: "Muito difícil",
  HARD: "Difícil",
  JUST_RIGHT: "Na medida",
  EASY: "Fácil",
  VERY_EASY: "Muito fácil",
};
