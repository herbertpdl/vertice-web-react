import { z } from "zod";
import {
  DESCRIPTION_MAX,
  HTTP_URL_PATTERN,
  NAME_MAX,
  VIDEO_URL_MAX,
  boundedText,
  requiredText,
  tooLong,
} from "./bounds";

export const exerciseSchema = z.object({
  name: requiredText(NAME_MAX, "Informe o nome do exercício"),
  // The one rule mirrored client-side (the server enforces it too).
  muscleGroupIds: z
    .array(z.number().int().positive())
    .min(1, "Selecione pelo menos um grupo muscular"),
  description: boundedText(DESCRIPTION_MAX),
  // http(s) only, as vertice-api (`^https?://\S+$`): the catalog is shared, so a `javascript:` or
  // `data:` link must never be stored.
  videoUrl: z
    .string()
    .trim()
    .max(VIDEO_URL_MAX, tooLong(VIDEO_URL_MAX))
    .regex(HTTP_URL_PATTERN, "Use um link começando com http:// ou https://")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseSchema>;
