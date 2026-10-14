"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { Button, TextField } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { rateLimitMessage } from "@/lib/api/rateLimit";
import { issueStudentSetupToken, setupLink } from "@/lib/api/students";
import type { PasswordSetup } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

/**
 * The first-access link a trainer shares with a client who has no password yet: the link with a
 * copy button and its expiry, or "Gerar link de acesso" to (re-)issue one. The token is shown
 * once by the BFF, so it only lives in this component's state.
 */
export function StudentAccessLink({
  studentId,
  setup: initialSetup,
  issueToken = issueStudentSetupToken,
}: {
  studentId: number;
  setup: PasswordSetup | null;
  /** Injectable for stories (no BFF in Storybook); defaults to the real API call. */
  issueToken?: typeof issueStudentSetupToken;
}) {
  const [setup, setSetup] = useState(initialSetup);
  const [copied, setCopied] = useState<"yes" | "manual" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: () => issueToken(studentId),
    onSuccess: (issued) => {
      setSetup(issued);
      setCopied(null);
    },
  });

  if (!setup) {
    const error = mutation.error;
    const alreadyHasPassword =
      error instanceof ApiError && error.code === "PRECONDITION_FAILED";
    return (
      <div className="flex w-full flex-col gap-[var(--space-3)]">
        {alreadyHasPassword ? (
          <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
            Este aluno já definiu a senha e pode entrar normalmente. Não é preciso um novo link.
          </p>
        ) : (
          <>
            <p className="text-[13px] leading-[1.5] text-[color:var(--color-text-secondary)]">
              Gere um link para o aluno definir a senha de acesso. Um link gerado antes deixa de
              funcionar.
            </p>
            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger)]/10 px-[14px] py-[10px] text-[13px] text-[color:var(--color-danger)]"
              >
                {error instanceof ApiError && error.status === 429
                  ? rateLimitMessage(error.retryAfter)
                  : "Não foi possível gerar o link. Tente novamente."}
              </div>
            )}
            <Button
              type="button"
              variant="outline"
              className="w-fit"
              loading={mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              Gerar link de acesso
            </Button>
          </>
        )}
      </div>
    );
  }

  // Only rendered after a user action (never server-side), but guard anyway.
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const link = setupLink(origin, setup.token);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied("yes");
    } catch {
      // No clipboard access (e.g. plain http on a LAN address): select it for a manual copy.
      inputRef.current?.select();
      setCopied("manual");
    }
  }

  return (
    <div className="flex w-full flex-col gap-[var(--space-3)]">
      <div className="flex w-full items-end gap-[var(--space-2)]">
        <TextField
          ref={inputRef}
          label="Link de acesso"
          readOnly
          value={link}
          onFocus={(event) => event.target.select()}
          className="min-w-0 flex-1"
        />
        <Button type="button" variant="outline" onClick={copy}>
          {copied === "yes" ? <Check width={16} height={16} /> : <Copy width={16} height={16} />}
          {copied === "yes" ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p className="text-[12px] leading-[1.5] text-[color:var(--color-text-tertiary)]">
        {copied === "manual"
          ? "Não foi possível copiar automaticamente: o link está selecionado, copie-o manualmente."
          : `Expira em ${formatDateTime(setup.expiresAt)}. O link só pode ser usado uma vez.`}
      </p>
    </div>
  );
}
