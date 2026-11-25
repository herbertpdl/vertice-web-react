import { apiClient } from "./client";
import type { components } from "./schema";
import type { ClientAnamnese } from "./types";

/** Under the student's own key family; the text lives only here, never in the editor's cache. */
export const anamneseQueryKey = (clientId: number) => ["student", clientId, "anamnese"] as const;

/** `GET /clients/:id/anamnese`: the empty state is `{ text: "", updatedAt: null }`, never a 404. */
export function fetchAnamnese(clientId: number) {
  return apiClient.get<ClientAnamnese>(`/clients/${clientId}/anamnese`);
}

type SaveAnamneseRequest = components["schemas"]["SaveClientAnamneseRequest"];

/** `PUT /clients/:id/anamnese` with the text as typed (never trimmed, E4); answers the stored state. */
export function saveAnamnese(clientId: number, text: string) {
  const body: SaveAnamneseRequest = { text };
  return apiClient.put<ClientAnamnese>(`/clients/${clientId}/anamnese`, body);
}
