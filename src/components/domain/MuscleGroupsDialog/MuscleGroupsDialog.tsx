"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Info, Pencil, X } from "lucide-react";
import { Button, Dialog, DialogFooter, SkeletonLine, TextField, useToast } from "@/components/ui";
import { invalidateAfterMuscleGroupWrite, muscleGroupErrorMessage } from "@/lib/admin/catalog";
import { adminKeys } from "@/lib/api/admin";
import { createAdminMuscleGroup, renameAdminMuscleGroup } from "@/lib/api/adminCatalog";
import { MUSCLE_GROUPS_STALE_TIME, fetchMuscleGroups } from "@/lib/api/muscleGroups";
import type { MuscleGroup } from "@/lib/api/types";
import { muscleGroupNameSchema } from "@/lib/validation/admin";

export interface MuscleGroupsApi {
  create: typeof createAdminMuscleGroup;
  rename: typeof renameAdminMuscleGroup;
}

const defaultApi: MuscleGroupsApi = { create: createAdminMuscleGroup, rename: renameAdminMuscleGroup };

/** The trimmed name's own problem, once something was typed (a blank field just disables saving). */
function nameError(value: string): string | undefined {
  if (value.trim() === "") return undefined;
  const parsed = muscleGroupNameSchema.safeParse(value);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

interface RenameRowProps {
  group: MuscleGroup;
  onDone: () => void;
  api: MuscleGroupsApi;
  className: string;
}

/** A row in rename mode (the "Posteriores de coxa" row of `D2koD`): the name, Salvar and Cancelar. */
function RenameRow({ group, onDone, api, className }: RenameRowProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [value, setValue] = useState(group.name);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  const parsed = muscleGroupNameSchema.safeParse(value);
  const unchanged = parsed.success && parsed.data === group.name;

  async function save() {
    if (submittingRef.current || !parsed.success) return;
    if (unchanged) {
      onDone();
      return;
    }
    submittingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await api.rename(group.id, parsed.data);
    } catch (failure) {
      submittingRef.current = false;
      setPending(false);
      setError(muscleGroupErrorMessage(failure, "Não foi possível renomear o grupo. Tente novamente."));
      return;
    }
    invalidateAfterMuscleGroupWrite(queryClient);
    toast({ tone: "success", message: `Grupo "${group.name}" renomeado para "${parsed.data}".` });
    onDone();
  }

  const shownError = error ?? nameError(value);

  return (
    <li className={`flex flex-col gap-[6px] bg-[var(--color-surface-hover)] px-[14px] py-[8px] ${className}`}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
        className="flex items-center gap-[12px]"
      >
        <input
          // The row opened for typing: the admin asked to rename this group.
          autoFocus
          aria-label={`Novo nome de ${group.name}`}
          aria-invalid={shownError ? true : undefined}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              // Cancels the rename, not the whole dialog.
              event.preventDefault();
              if (!pending) onDone();
            }
          }}
          className={`h-[30px] min-w-0 flex-1 rounded-[var(--radius-sm)] border bg-[var(--color-bg)] px-[10px] text-[13px] text-[color:var(--color-text-primary)] outline-none ${
            shownError ? "border-[var(--color-danger)]" : "border-[var(--color-primary)]"
          }`}
        />
        <button
          type="submit"
          aria-label="Salvar nome"
          disabled={pending || !parsed.success}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[color:var(--color-success)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-35"
        >
          <Check aria-hidden="true" width={15} height={15} />
        </button>
        <button
          type="button"
          aria-label="Cancelar renomeação"
          disabled={pending}
          onClick={onDone}
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface)] disabled:opacity-35"
        >
          <X aria-hidden="true" width={15} height={15} />
        </button>
      </form>
      {shownError && (
        <p role="alert" className="text-[11px] text-[color:var(--color-danger)]">
          {shownError}
        </p>
      )}
    </li>
  );
}

interface MuscleGroupsDialogProps {
  onClose: () => void;
  /** Injected by stories (no BFF in Storybook); defaults to the real calls. */
  api?: MuscleGroupsApi;
}

/**
 * "Grupos musculares" (pen.dev `D2koD`; PRD R61–R63, R65, E34–E36): add a group and rename any,
 * one at a time. There is no remove (R63), and no per-group count (`MuscleGroup` is `{id, name}`,
 * §7.1). A duplicate name, ignoring case and accents, is the BFF's 409 `NAME_TAKEN`: "Já existe um
 * grupo com esse nome". Each write invalidates the groups, both catalog lists and the history (§9).
 */
export function MuscleGroupsDialog({ onClose, api = defaultApi }: MuscleGroupsDialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<number | null>(null);
  const submittingRef = useRef(false);

  const groups = useQuery({
    queryKey: adminKeys.muscleGroups(),
    queryFn: fetchMuscleGroups,
    staleTime: MUSCLE_GROUPS_STALE_TIME,
  });

  const parsed = muscleGroupNameSchema.safeParse(name);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (submittingRef.current || !parsed.success) return;
    submittingRef.current = true;
    setPending(true);
    setError(null);
    try {
      await api.create(parsed.data);
    } catch (failure) {
      setError(muscleGroupErrorMessage(failure, "Não foi possível adicionar o grupo. Tente novamente."));
      return;
    } finally {
      submittingRef.current = false;
      setPending(false);
    }
    invalidateAfterMuscleGroupWrite(queryClient);
    toast({ tone: "success", message: `Grupo "${parsed.data}" adicionado.` });
    setName("");
  }

  return (
    <Dialog title="Grupos musculares" onClose={onClose} width={520}>
      <div className="flex w-full flex-col gap-[var(--space-4)]">
        <div className="flex items-start gap-[10px] rounded-[var(--radius-md)] bg-[#4da6ff1a] px-[12px] py-[10px]">
          <Info aria-hidden="true" width={16} height={16} className="mt-[1px] shrink-0 text-[color:var(--color-info)]" />
          <p className="text-[12px] leading-[1.5] text-[color:var(--color-info)]">
            Você pode adicionar e renomear grupos. Grupos não podem ser removidos, porque exercícios e treinos
            dependem deles.
          </p>
        </div>

        <form noValidate onSubmit={(event) => void add(event)} className="flex w-full items-start gap-[12px]">
          <TextField
            label="Novo grupo"
            placeholder="Ex.: Adutores"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            error={error ?? nameError(name)}
            className="min-w-0 flex-1"
          />
          {/* Lined up with the input under the label (label 15 px + 6 px gap). */}
          <Button type="submit" loading={pending} disabled={pending || !parsed.success} className="mt-[21px] shrink-0">
            Adicionar
          </Button>
        </form>

        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
          {groups.isPending ? (
            <div aria-busy="true" aria-label="Carregando grupos" className="flex flex-col">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className={`px-[14px] py-[14px] ${i > 0 ? "border-t border-[var(--color-border)]" : ""}`}>
                  <SkeletonLine width={i % 2 ? 120 : 90} height={12} />
                </div>
              ))}
            </div>
          ) : groups.isError ? (
            <p role="alert" className="flex flex-wrap items-center gap-[6px] px-[14px] py-[14px] text-[13px]">
              <span className="text-[color:var(--color-danger)]">Não foi possível carregar os grupos musculares.</span>
              <button
                type="button"
                onClick={() => void groups.refetch()}
                className="font-semibold text-[color:var(--color-primary)]"
              >
                Tentar novamente
              </button>
            </p>
          ) : (
            <ul aria-label="Grupos musculares" className="max-h-[366px] overflow-y-auto">
              {groups.data.map((group, index) => {
                const divider = index > 0 ? "border-t border-[var(--color-border)]" : "";
                if (renaming === group.id) {
                  return (
                    <RenameRow
                      key={group.id}
                      group={group}
                      api={api}
                      className={divider}
                      onDone={() => setRenaming(null)}
                    />
                  );
                }
                return (
                  <li key={group.id} className={`flex items-center gap-[12px] px-[14px] py-[8px] ${divider}`}>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[color:var(--color-text-primary)]">
                      {group.name}
                    </span>
                    <button
                      type="button"
                      aria-label={`Renomear ${group.name}`}
                      onClick={() => setRenaming(group.id)}
                      className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-[color:var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-hover)] hover:text-[color:var(--color-primary)]"
                    >
                      <Pencil aria-hidden="true" width={15} height={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}
