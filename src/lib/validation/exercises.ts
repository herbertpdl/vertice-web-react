import { z } from "zod";
import { youtubeVideoId } from "@/lib/youtube";
import {
  DESCRIPTION_MAX,
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
  // YouTube only (R8), as vertice-api and the BFF: the client app plays videos in an embedded
  // YouTube player. The same parser on every repo, so what one accepts the others do.
  videoUrl: z
    .string()
    .trim()
    .max(VIDEO_URL_MAX, tooLong(VIDEO_URL_MAX))
    .refine((value) => youtubeVideoId(value) !== null, "Só aceitamos vídeos do YouTube (youtube.com ou youtu.be).")
    .optional()
    .or(z.literal("")),
});

export type ExerciseFormInput = z.infer<typeof exerciseSchema>;
