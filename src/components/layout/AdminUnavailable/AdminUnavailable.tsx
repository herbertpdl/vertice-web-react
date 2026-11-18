"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * The admin layout's fail-closed state (admin-panel spec W4): `GET /auth/me` failed (network or
 * 5xx), so the role is unknown and no admin data or shell is rendered. "Tentar novamente" reloads,
 * which runs the server check again.
 */
export function AdminUnavailable() {
  const [retrying, setRetrying] = useState(false);
  return (
    <main className="font-base flex min-h-screen w-full items-center justify-center bg-[var(--color-bg)] p-[var(--space-6)]">
      <section
        aria-labelledby="admin-unavailable-title"
        className="flex w-full max-w-[520px] flex-col gap-[var(--space-5)] rounded-[var(--radius-lg)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] p-[var(--space-6)]"
      >
        <h1
          id="admin-unavailable-title"
          className="font-heading text-[length:var(--text-lg)] font-semibold text-[color:var(--color-text-primary)]"
        >
          Não foi possível carregar o painel
        </h1>
        <p role="alert" className="text-[length:var(--text-sm)] leading-[1.5] text-[color:var(--color-text-secondary)]">
          Verifique sua conexão e tente novamente em instantes.
        </p>
        <div className="flex justify-end">
          <Button
            loading={retrying}
            onClick={() => {
              setRetrying(true);
              window.location.reload();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </section>
    </main>
  );
}
