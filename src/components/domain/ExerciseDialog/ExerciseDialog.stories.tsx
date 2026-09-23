import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { ExerciseDialog } from "./ExerciseDialog";
import { muscleGroups, remadaPropria } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { ApiError } from "@/lib/api/client";

const groupsKey = JSON.stringify(muscleGroupsQueryKey);

const meta = {
  component: ExerciseDialog,
  args: {
    onClose: fn(),
    onCreated: fn(),
    api: {
      create: fn(async (input) => ({ ...remadaPropria, id: 99, ...input, muscleGroups: [] })),
      update: fn(async () => remadaPropria),
      remove: fn(async () => undefined),
    },
  },
  decorators: [withSeededQueries({ [groupsKey]: muscleGroups })],
} satisfies Meta<typeof ExerciseDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const groupsTrigger = (canvas: ReturnType<typeof within>) =>
  canvas.getByRole("button", { name: "Grupos musculares" });

export const Create: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Novo exercício" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Excluir" })).toBeNull();
    await expect(groupsTrigger(canvas)).toHaveTextContent("Selecione os grupos");
    await expect(canvas.getByRole("button", { name: "Criar exercício" })).toBeDisabled();
  },
};

export const EditOwn: Story = {
  args: { exercise: remadaPropria },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Editar exercício" })).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Excluir" })).toBeVisible();
    await expect(groupsTrigger(canvas)).toHaveTextContent("Costas, Bíceps");
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Salvar alterações" })).toBeEnabled(),
    );
  },
};

/** Unchecking every group shows the one mirrored rule; nothing can be sent (R40/E13). */
export const MissingGroup: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    const submit = canvas.getByRole("button", { name: "Criar exercício" });
    await userEvent.type(canvas.getByLabelText("Nome do exercício"), "Remada Unilateral no Banco");
    await expect(submit).toBeDisabled();
    await expect(canvas.queryByText("Selecione pelo menos um grupo muscular")).toBeNull();

    await userEvent.click(groupsTrigger(canvas));
    await userEvent.click(await body.findByRole("option", { name: "Costas" }));
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(body.getByRole("option", { name: "Costas" }));
    await userEvent.keyboard("{Escape}");

    await expect(await canvas.findByText("Selecione pelo menos um grupo muscular")).toBeVisible();
    await expect(submit).toBeDisabled();
    await expect(args.api!.create).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const SubmitEnabledWhenValid: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    const submit = canvas.getByRole("button", { name: "Criar exercício" });
    await userEvent.type(canvas.getByLabelText("Nome do exercício"), "Remada Unilateral no Banco");
    await userEvent.click(groupsTrigger(canvas));
    await userEvent.click(await body.findByRole("option", { name: "Costas" }));
    await userEvent.click(body.getByRole("option", { name: "Bíceps" }));
    await userEvent.keyboard("{Escape}");
    await expect(groupsTrigger(canvas)).toHaveTextContent("Costas, Bíceps");
    await waitFor(() => expect(submit).toBeEnabled());

    await userEvent.click(submit);
    await waitFor(() =>
      expect(args.api!.create).toHaveBeenCalledWith({
        name: "Remada Unilateral no Banco",
        muscleGroupIds: [2, 4],
        description: "",
        videoUrl: "",
      }),
    );
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const GroupsUnavailable: Story = {
  decorators: [withSeededQueries({}, { failing: [groupsKey] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Não foi possível carregar os grupos musculares")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Tentar novamente" })).toBeVisible();
    await expect(groupsTrigger(canvas)).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Criar exercício" })).toBeDisabled();
  },
};

/** A failed save shows fixed pt-BR copy, never the server's English message. */
export const SaveFailed: Story = {
  args: {
    exercise: remadaPropria,
    api: {
      create: fn(),
      update: fn(async () => {
        throw new Error("Exercise 7 not found");
      }),
      remove: fn(),
    },
  },
  play: async ({ canvas, userEvent }) => {
    const submit = canvas.getByRole("button", { name: "Salvar alterações" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await expect(await canvas.findByText("Não foi possível salvar o exercício")).toBeVisible();
    await expect(canvas.queryByText("Exercise 7 not found")).toBeNull();
  },
};

const IN_USE_MESSAGE = "Exercise 7 is used by a workout and cannot be deleted";

/** 409 on delete: a pt-BR refusal block, the dialog stays open (R34/E5). */
export const DeleteRefusedInUse: Story = {
  args: {
    exercise: remadaPropria,
    api: {
      create: fn(),
      update: fn(),
      remove: fn(async () => {
        throw new ApiError({ code: "PRECONDITION_FAILED", message: IN_USE_MESSAGE }, 409);
      }),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Excluir" }));
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Não é possível excluir este exercício");
    await expect(alert).toHaveTextContent(
      "Um treino usa este exercício. Remova-o dos treinos antes de excluí-lo.",
    );
    await expect(canvas.queryByText(IN_USE_MESSAGE, { exact: false })).toBeNull();
    await expect(document.body).not.toHaveTextContent(IN_USE_MESSAGE);
    await expect(canvas.queryByText("Não foi possível excluir o exercício")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Excluir" })).toBeEnabled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** Any other delete failure: the fixed pt-BR root error, no refusal block. */
export const DeleteFailedGeneric: Story = {
  args: {
    exercise: remadaPropria,
    api: {
      create: fn(),
      update: fn(),
      remove: fn(async () => {
        throw new ApiError({ code: "NOT_FOUND", message: "Exercise 7 not found" }, 404);
      }),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Excluir" }));
    await expect(await canvas.findByText("Não foi possível excluir o exercício")).toBeVisible();
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.queryByText("Exercise 7 not found")).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
