"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { CircleAlert, CircleCheck, X } from "lucide-react";

export type ToastTone = "success" | "error";

/** How long a toast stays up before it dismisses itself. */
export const TOAST_DURATION_MS = 5_000;

interface ToastProps {
  tone?: ToastTone;
  message: string;
  onClose?: () => void;
  className?: string;
}

/**
 * One notice (pen.dev Admin Toast `jjLsR`, variants in `bHWbL`): a success check or an error alert,
 * the message, and a close button. Use `ToastProvider` + `useToast()` to show one; this is the
 * look alone.
 */
export function Toast({ tone = "success", message, onClose, className = "" }: ToastProps) {
  const Icon = tone === "success" ? CircleCheck : CircleAlert;
  return (
    <div
      className={`font-base flex w-full max-w-[400px] items-center gap-[12px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-[16px] py-[14px] shadow-[0_8px_24px_#00000066] ${className}`}
    >
      <Icon
        aria-hidden="true"
        className={`h-[18px] w-[18px] shrink-0 ${
          tone === "success" ? "text-[color:var(--color-success)]" : "text-[color:var(--color-danger)]"
        }`}
      />
      <p className="flex-1 text-[13px] leading-[1.45] text-[color:var(--color-text-primary)]">{message}</p>
      {onClose && (
        <button
          type="button"
          aria-label="Fechar aviso"
          onClick={onClose}
          className="shrink-0 text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)]"
        >
          <X aria-hidden="true" className="h-[16px] w-[16px]" />
        </button>
      )}
    </div>
  );
}

interface ToastEntry {
  id: number;
  tone: ToastTone;
  message: string;
}

type ShowToast = (toast: { tone?: ToastTone; message: string }) => void;

const ToastContext = createContext<ShowToast | null>(null);

/** `useToast()({tone, message})` shows a toast; it needs a `ToastProvider` above it. */
export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast needs a ToastProvider");
  return show;
}

function AutoDismiss({ entry, onDone }: { entry: ToastEntry; onDone: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDone(entry.id), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [entry.id, onDone]);
  return <Toast tone={entry.tone} message={entry.message} onClose={() => onDone(entry.id)} />;
}

/**
 * Holds the toasts on screen, `fixed` (render it outside any transformed ancestor): bottom right (bottom, full width with a 16 px gutter on a phone),
 * above dialogs, in a polite live region so a screen reader reads each one once. Each dismisses
 * itself after `TOAST_DURATION_MS` or on its close button.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(0);

  const show: ShowToast = ({ tone = "success", message }) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current, { id, tone, message }]);
  };
  const dismiss = (id: number) => setToasts((current) => current.filter((toast) => toast.id !== id));

  return (
    <ToastContext.Provider value={show}>
      {children}
      {/* Present from the first render (an empty live region), so each toast added is announced. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-[16px] bottom-[16px] z-[70] flex flex-col items-center gap-[8px] sm:inset-x-auto sm:right-[24px] sm:bottom-[24px] sm:items-end"
      >
        {toasts.map((entry) => (
          <div key={entry.id} className="pointer-events-auto w-full sm:w-[400px]">
            <AutoDismiss entry={entry} onDone={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
