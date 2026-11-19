import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, spyOn, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { adminMuscleGroups } from "../adminStoryFixtures";
import { withSeededQueries } from "../storyQuery";
import { MuscleGroupsDialog } from "./MuscleGroupsDialog";

let client: QueryClient | null = null;
const groupsKey = JSON.stringify(["admin", "muscle-groups"]);
const nameTaken = () => Promise.reject(new ApiError({ code: "NAME_TAKEN", message: "x" }, 409));

const meta = {
  component: MuscleGroupsDialog,
  args: {
    onClose: fn(),
    api: {
      create: fn(async (name: string) => ({ id: 99, name })),
      rename: fn(async (id: number, name: string) => ({ id, name })),
    },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({ [groupsKey]: adminMuscleGroups }, { onClient: (seeded) => (client = seeded) }),
  ],
} satisfies Meta<typeof MuscleGroupsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const list = () => within(body().getByRole("list", { name: "Grupos musculares" }));

/** `D2koD`: the note, the add row and every group with "Renomear"; no remove, no counts (§7.1). */
export const Default: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Grupos musculares" })).toBeVisible();
    await expect(body().getByText(/Grupos não podem ser removidos/)).toBeVisible();
    await expect(list().getAllByRole("listitem")).toHaveLength(9);
    await expect(list().getByRole("button", { name: "Renomear Peito" })).toBeVisible();
    await expect(body().queryByRole("button", { name: /Remover|Excluir/ })).toBeNull();
    await expect(body().getByRole("button", { name: "Adicionar" })).toBeDisabled();
    // The footer's "Fechar" (the header's X has the same name).
    await userEvent.click(body().getAllByRole("button", { name: "Fechar" }).at(-1)!);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** Add: one request with the trimmed name; groups, lists and history invalidated; the field clears. */
export const Add: Story = {
  play: async ({ userEvent, args }) => {
    const invalidate = spyOn(client!, "invalidateQueries");
    await userEvent.type(body().getByRole("textbox", { name: "Novo grupo" }), "  Adutores ");
    await userEvent.dblClick(body().getByRole("button", { name: "Adicionar" }));
    await waitFor(() => expect(body().getByRole("textbox", { name: "Novo grupo" })).toHaveValue(""));
    await expect(args.api!.create).toHaveBeenCalledTimes(1);
    await expect(args.api!.create).toHaveBeenCalledWith("Adutores");
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "muscle-groups"] });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "exercises"] });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "actions"] });
    await expect(await body().findByText('Grupo "Adutores" adicionado.')).toBeVisible();
  },
};

/** E34: a duplicate name (ignoring case and accents, the BFF decides) has the group's own copy. */
export const AddNameTaken: Story = {
  args: { api: { create: fn(nameTaken), rename: fn() } },
  play: async ({ userEvent }) => {
    await userEvent.type(body().getByRole("textbox", { name: "Novo grupo" }), "peito");
    await userEvent.click(body().getByRole("button", { name: "Adicionar" }));
    await expect(await body().findByText("Já existe um grupo com esse nome")).toBeVisible();
    await expect(body().getByRole("textbox", { name: "Novo grupo" })).toHaveValue("peito");
  },
};

/** Over 50 UTF-16 units: refused before any request. */
export const AddTooLong: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.type(body().getByRole("textbox", { name: "Novo grupo" }), "a".repeat(51));
    await expect(body().getByText("Use no máximo 50 caracteres")).toBeVisible();
    await expect(body().getByRole("button", { name: "Adicionar" })).toBeDisabled();
    await expect(args.api!.create).not.toHaveBeenCalled();
  },
};

/** The `D2koD` rename row: prefilled, saved with Enter, back to the list. */
export const Rename: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.click(list().getByRole("button", { name: "Renomear Posteriores de coxa" }));
    const input = body().getByRole("textbox", { name: "Novo nome de Posteriores de coxa" });
    await expect(input).toHaveFocus();
    await expect(input).toHaveValue("Posteriores de coxa");
    await userEvent.clear(input);
    await userEvent.type(input, "Posteriores da coxa{Enter}");
    await waitFor(() => expect(args.api!.rename).toHaveBeenCalledWith(7, "Posteriores da coxa"));
    await waitFor(() => expect(body().queryByRole("textbox", { name: /Novo nome de/ })).toBeNull());
    await expect(
      await body().findByText('Grupo "Posteriores de coxa" renomeado para "Posteriores da coxa".'),
    ).toBeVisible();
  },
};

/** Escape cancels the rename, not the dialog; an unchanged name sends nothing. */
export const RenameCancel: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.click(list().getByRole("button", { name: "Renomear Peito" }));
    await userEvent.keyboard("{Escape}");
    await expect(body().queryByRole("textbox", { name: "Novo nome de Peito" })).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.click(list().getByRole("button", { name: "Renomear Peito" }));
    await userEvent.click(body().getByRole("button", { name: "Salvar nome" }));
    await expect(body().queryByRole("textbox", { name: "Novo nome de Peito" })).toBeNull();
    await expect(args.api!.rename).not.toHaveBeenCalled();
  },
};

/** A rename to a taken name stays open with the group's copy. */
export const RenameNameTaken: Story = {
  args: { api: { create: fn(), rename: fn(nameTaken) } },
  play: async ({ userEvent }) => {
    await userEvent.click(list().getByRole("button", { name: "Renomear Bíceps" }));
    const input = body().getByRole("textbox", { name: "Novo nome de Bíceps" });
    await userEvent.clear(input);
    await userEvent.type(input, "Tríceps{Enter}");
    await expect(await body().findByRole("alert")).toHaveTextContent("Já existe um grupo com esse nome");
    await expect(input).toBeVisible();
  },
};

export const Loading: Story = {
  decorators: [withSeededQueries({}, { pending: [groupsKey] })],
  play: async () => {
    await expect(body().getByLabelText("Carregando grupos")).toBeVisible();
  },
};

export const LoadError: Story = {
  decorators: [withSeededQueries({}, { failing: [groupsKey] })],
  play: async () => {
    await expect(body().getByRole("alert")).toHaveTextContent("Não foi possível carregar os grupos musculares.");
    await expect(body().getByRole("button", { name: "Tentar novamente" })).toBeVisible();
  },
};
