"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui";
import { apiErrorMessage } from "@/lib/api/errorMessages";
import { revealStudentCpf } from "@/lib/api/students";

/**
 * A client's CPF as the BFF sends it (masked, `***.***.***-25`), with "mostrar" to fetch the full
 * value (`GET /clients/:id?reveal=cpf`, logged by the BFF) and "ocultar" to drop it. The full CPF
 * lives only in this component's state: not in the query cache, not in storage, and gone on
 * unmount (leaving the page). Mount it with `key={studentId}` so another client starts masked.
 */
export function StudentCpf({
  studentId,
  maskedCpf,
  reveal = revealStudentCpf,
}: {
  studentId: number;
  /** The CPF from `ClientDetail` (masked); `""` when the client has none. */
  maskedCpf: string;
  /** Injectable for stories (no BFF in Storybook); defaults to the real API call. */
  reveal?: typeof revealStudentCpf;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on "ocultar": a reveal still in flight then lands nowhere instead of re-showing the CPF.
  const attempt = useRef(0);

  if (!maskedCpf) return null;

  async function show() {
    const current = ++attempt.current;
    setLoading(true);
    setError(null);
    try {
      const cpf = await reveal(studentId);
      if (attempt.current === current) setRevealed(cpf);
    } catch (err) {
      if (attempt.current === current) setError(apiErrorMessage(err, "Não foi possível mostrar o CPF"));
    } finally {
      if (attempt.current === current) setLoading(false);
    }
  }

  function hide() {
    attempt.current++;
    setRevealed(null);
    setLoading(false);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span>{revealed ?? maskedCpf}</span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        loading={loading}
        onClick={revealed === null ? show : hide}
      >
        {revealed === null ? "mostrar" : "ocultar"}
      </Button>
      {error && (
        <span role="alert" className="text-[color:var(--color-danger)]">
          {error}
        </span>
      )}
    </span>
  );
}
