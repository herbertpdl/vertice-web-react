import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn, spyOn, waitFor, within } from "storybook/test";
import { ToastProvider } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { adminMuscleGroups, adminPrivateExercises, adminStarterExercises } from "../adminStoryFixtures";
import { withSeededQueries } from "../storyQuery";
import { AdminExerciseDialog } from "./AdminExerciseDialog";

let client: QueryClient | null = null;
const groupsKey = JSON.stringify(["admin", "muscle-groups"]);
const saved = adminStarterExercises[0];
const nameTaken = () => new ApiError({ code: "NAME_TAKEN", message: "x" }, 409);

const meta = {
  component: AdminExerciseDialog,
  args: {
    mode: "create",
    onClose: fn(),
    api: { create: fn(async () => saved), update: fn(async () => saved), promote: fn(async () => saved) },
  },
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
    withSeededQueries({ [groupsKey]: adminMuscleGroups }, { onClient: (seeded) => (client = seeded) }),
  ],
} satisfies Meta<typeof AdminExerciseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const nameField = () => body().getByRole("textbox", { name: "Nome" });

async function pickGroup(userEvent: Parameters<NonNullable<Story["play"]>>[0]["userEvent"], name: string) {
  await userEvent.click(body().getByRole("button", { name: "Grupos musculares" }));
  await userEvent.click(within(await body().findByRole("listbox")).getByRole("option", { name }));
  await userEvent.keyboard("{Escape}");
}

/** `Ef6Bz`: empty, "Criar exercício" disabled until a name and a group. */
export const Create: Story = {
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Novo exercício" })).toBeVisible();
    await expect(body().getByRole("button", { name: "Criar exercício" })).toBeDisabled();
    await userEvent.type(nameField(), "  Remada baixa  ");
    await pickGroup(userEvent, "Costas");
    await expect(body().getByRole("button", { name: "Criar exercício" })).toBeEnabled();
    const invalidate = spyOn(client!, "invalidateQueries");
    await userEvent.dblClick(body().getByRole("button", { name: "Criar exercício" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(args.api!.create).toHaveBeenCalledTimes(1);
    await expect(args.api!.create).toHaveBeenCalledWith({
      name: "Remada baixa",
      muscleGroupIds: [2],
      description: "",
      videoUrl: "",
    });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "exercises"] });
    await expect(invalidate).toHaveBeenCalledWith({ queryKey: ["admin", "actions"] });
    await expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["admin"] });
    await expect(await body().findByText('"Remada baixa" foi adicionado ao catálogo inicial.')).toBeVisible();
  },
};

/** The trainer form's bounds: only YouTube links. */
export const InvalidVideo: Story = {
  play: async ({ userEvent }) => {
    await userEvent.type(body().getByRole("textbox", { name: "Link do vídeo" }), "https://vimeo.com/1");
    await expect(await body().findByText(/Só aceitamos vídeos do YouTube/)).toBeVisible();
  },
};

/** `a5D2r`: an edit prefilled from the row, and a full replace of every field. */
export const Edit: Story = {
  args: { mode: "edit", exercise: adminStarterExercises[1] },
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Editar exercício" })).toBeVisible();
    await expect(nameField()).toHaveValue("Agachamento livre");
    await expect(body().getByRole("textbox", { name: "Descrição" })).toHaveValue(
      "Pés na largura dos ombros, desça até a coxa ficar paralela ao chão mantendo a coluna neutra.",
    );
    await userEvent.clear(nameField());
    await userEvent.type(nameField(), "Agachamento livre com barra");
    await userEvent.click(body().getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(args.api!.update).toHaveBeenCalledWith(102, {
      name: "Agachamento livre com barra",
      muscleGroupIds: [6, 8],
      description: "Pés na largura dos ombros, desça até a coxa ficar paralela ao chão mantendo a coluna neutra.",
      videoUrl: "https://youtube.com/watch?v=aclHkVaku9U",
    });
  },
};

/** `a5D2r`: 409 `NAME_TAKEN` is a field error on "Nome" until the name changes. */
export const EditNameTaken: Story = {
  args: {
    mode: "edit",
    exercise: adminStarterExercises[1],
    api: { create: fn(), update: fn(async () => Promise.reject(nameTaken())), promote: fn() },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(body().getByRole("button", { name: "Salvar" }));
    await expect(await body().findByText("Já existe um exercício com esse nome")).toBeVisible();
    await expect(body().getByRole("button", { name: "Salvar" })).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.type(nameField(), " 2");
    await expect(body().queryByText("Já existe um exercício com esse nome")).toBeNull();
    await expect(body().getByRole("button", { name: "Salvar" })).toBeEnabled();
  },
};

/** `I6NIe`: the copy is prefilled from the trainer's exercise, which stays as it is. */
export const Promote: Story = {
  args: { mode: "promote", exercise: adminPrivateExercises[0] },
  play: async ({ userEvent, args }) => {
    await expect(body().getByRole("heading", { name: "Promover ao catálogo" })).toBeVisible();
    await expect(body().getByText(/O exercício privado de Ana Ribeiro continua igual/)).toBeVisible();
    await expect(nameField()).toHaveValue("Elevação pélvica com pausa");
    const selected = within(body().getByRole("list", { name: "Selecionados" }));
    await expect(selected.getByText("Glúteos")).toBeVisible();
    await expect(selected.getByText("Posteriores de coxa")).toBeVisible();
    await userEvent.click(body().getByRole("button", { name: "Adicionar ao catálogo" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
    await expect(args.api!.promote).toHaveBeenCalledWith(201, {
      name: "Elevação pélvica com pausa",
      muscleGroupIds: [8, 7],
      description: "Pausa de 2 s no topo, contraindo os glúteos. Banco na altura das escápulas.",
      videoUrl: "https://youtube.com/watch?v=xDmFkJxPzeM",
    });
    await expect(
      await body().findByText('Uma cópia de "Elevação pélvica com pausa" foi adicionada ao catálogo inicial.'),
    ).toBeVisible();
  },
};

/** E32: a promote copy with a starter name already taken. */
export const PromoteNameTaken: Story = {
  args: {
    mode: "promote",
    exercise: adminPrivateExercises[0],
    api: { create: fn(), update: fn(), promote: fn(async () => Promise.reject(nameTaken())) },
  },
  play: async ({ userEvent }) => {
    await userEvent.click(body().getByRole("button", { name: "Adicionar ao catálogo" }));
    await expect(await body().findByText("Já existe um exercício com esse nome")).toBeVisible();
  },
};

/** Any other failure stays in the dialog, keyed on its code. */
export const PromoteAlreadyStarter: Story = {
  args: {
    mode: "promote",
    exercise: adminPrivateExercises[0],
    api: {
      create: fn(),
      update: fn(),
      promote: fn(async () => Promise.reject(new ApiError({ code: "PRECONDITION_FAILED", message: "x" }, 409))),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(body().getByRole("button", { name: "Adicionar ao catálogo" }));
    await expect(await body().findByRole("alert")).toHaveTextContent("Este exercício já está no catálogo inicial.");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** The groups could not load: the picker is disabled, with a retry, and nothing can be sent. */
export const GroupsError: Story = {
  decorators: [withSeededQueries({}, { failing: [groupsKey] })],
  play: async () => {
    await expect(body().getByText("Não foi possível carregar os grupos musculares")).toBeVisible();
    await expect(body().getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(body().getByRole("button", { name: "Criar exercício" })).toBeDisabled();
  },
};
