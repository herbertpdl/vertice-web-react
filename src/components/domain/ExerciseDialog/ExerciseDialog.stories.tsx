import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, spyOn, waitFor, within, type MockInstance } from "storybook/test";
import { ExerciseDialog } from "./ExerciseDialog";
import { muscleGroups, remadaPropria, supino } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { muscleGroupsQueryKey } from "@/lib/api/muscleGroups";
import { ApiError } from "@/lib/api/client";

const groupsKey = JSON.stringify(muscleGroupsQueryKey);

/** A story-level QueryClient whose `invalidateQueries` is spied on, read back in `play`. */
let invalidateSpy: MockInstance | undefined;
const withInvalidateSpy = withSeededQueries(
  { [groupsKey]: muscleGroups },
  {
    onClient: (client) => {
      invalidateSpy = spyOn(client, "invalidateQueries");
    },
  },
);

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

/** Videos play in the client app's YouTube player: any other link is refused (R8). */
export const VideoNotYouTube: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const body = within(document.body);
    await userEvent.type(canvas.getByLabelText("Nome do exercício"), "Remada Unilateral no Banco");
    await userEvent.click(groupsTrigger(canvas));
    await userEvent.click(await body.findByRole("option", { name: "Costas" }));
    await userEvent.keyboard("{Escape}");
    await userEvent.type(canvas.getByLabelText("URL do vídeo (opcional)"), "https://vimeo.com/824512");
    await userEvent.tab();
    await expect(
      await canvas.findByText("Só aceitamos vídeos do YouTube (youtube.com ou youtu.be)."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Criar exercício" })).toBeDisabled();
    await expect(args.api!.create).not.toHaveBeenCalled();
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

/** Excluir, then the confirmation step's destructive button. */
async function confirmDelete(
  canvas: ReturnType<typeof within>,
  userEvent: { click: (element: Element) => Promise<void> },
) {
  await userEvent.click(canvas.getByRole("button", { name: "Excluir" }));
  await userEvent.click(await canvas.findByRole("button", { name: "Excluir exercício" }));
}

/** Excluir asks first: naming the exercise, a destructive confirm and Cancelar. Cancel deletes nothing. */
export const DeleteConfirmCancel: Story = {
  args: { exercise: remadaPropria },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Excluir" }));
    await expect(await canvas.findByRole("heading", { name: "Excluir exercício?" })).toBeVisible();
    await expect(canvas.getByRole("dialog")).toHaveTextContent(
      "Remada Unilateral no Banco será removido do seu catálogo. Esta ação não pode ser desfeita.",
    );
    await expect(canvas.getByRole("button", { name: "Excluir exercício" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Cancelar" }));
    await expect(await canvas.findByRole("heading", { name: "Editar exercício" })).toBeVisible();
    // Focus goes back to the Excluir that opened the step, not to "Fechar".
    await waitFor(() => expect(canvas.getByRole("button", { name: "Excluir" })).toHaveFocus());
    // The form kept its values.
    await expect(canvas.getByLabelText("Nome do exercício")).toHaveValue("Remada Unilateral no Banco");
    await expect(args.api!.remove).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();

    // Escape on the confirmation step also just goes back.
    await userEvent.click(canvas.getByRole("button", { name: "Excluir" }));
    await canvas.findByRole("heading", { name: "Excluir exercício?" });
    await userEvent.keyboard("{Escape}");
    await expect(await canvas.findByRole("heading", { name: "Editar exercício" })).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Excluir" })).toHaveFocus());
    await expect(args.api!.remove).not.toHaveBeenCalled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** Confirming deletes the exercise and closes the dialog. */
export const DeleteConfirmed: Story = {
  args: { exercise: remadaPropria },
  play: async ({ canvas, userEvent, args }) => {
    await confirmDelete(canvas, userEvent);
    await waitFor(() => expect(args.api!.remove).toHaveBeenCalledWith(remadaPropria.id));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/**
 * While the delete is in flight the confirm button is disabled (not just `loading`, which leaves it
 * keyboard-activatable), Cancelar too, and Escape doesn't leave the step.
 */
export const DeletePending: Story = {
  args: {
    exercise: remadaPropria,
    api: { create: fn(), update: fn(), remove: fn(() => new Promise<void>(() => {})) },
  },
  play: async ({ canvas, userEvent, args }) => {
    await confirmDelete(canvas, userEvent);
    const confirm = canvas.getByRole("button", { name: "Excluir exercício" });
    await waitFor(() => expect(confirm).toBeDisabled());
    // `isPending` flipping must not re-run Dialog's focus effect (unstable `onClose`).
    await expect(canvas.getByRole("button", { name: "Fechar" })).not.toHaveFocus();
    await expect(canvas.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("heading", { name: "Excluir exercício?" })).toBeVisible();
    await expect(args.api!.remove).toHaveBeenCalledTimes(1);
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** A starter row never reaches the dialog through the UI (R28); if it does, it has no Excluir. */
export const StarterHasNoDelete: Story = {
  args: { exercise: supino },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Editar exercício" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Excluir" })).toBeNull();
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
    await confirmDelete(canvas, userEvent);
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Não é possível excluir este exercício");
    await expect(alert).toHaveTextContent(
      "Um treino usa este exercício. Remova-o dos treinos antes de excluí-lo.",
    );
    await expect(canvas.queryByText(IN_USE_MESSAGE, { exact: false })).toBeNull();
    await expect(document.body).not.toHaveTextContent(IN_USE_MESSAGE);
    await expect(canvas.queryByText("Não foi possível excluir o exercício")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Excluir" })).toBeEnabled();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Excluir" })).toHaveFocus());
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
    await confirmDelete(canvas, userEvent);
    await expect(await canvas.findByText("Não foi possível excluir o exercício")).toBeVisible();
    await waitFor(() => expect(canvas.getByRole("button", { name: "Excluir" })).toHaveFocus());
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(canvas.queryByText("Exercise 7 not found")).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

const FORBIDDEN_MESSAGE = "You do not have access to exercise 7";

/** 403 on delete (stale row): fixed pt-BR copy, no English, the dialog stays open. */
export const DeleteForbidden: Story = {
  decorators: [withInvalidateSpy],
  args: {
    exercise: remadaPropria,
    api: {
      create: fn(),
      update: fn(),
      remove: fn(async () => {
        throw new ApiError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE }, 403);
      }),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await confirmDelete(canvas, userEvent);
    await expect(
      await canvas.findByText("Você não tem permissão para excluir este exercício"),
    ).toBeVisible();
    await expect(document.body).not.toHaveTextContent(FORBIDDEN_MESSAGE);
    await expect(canvas.queryByRole("alert")).toBeNull();
    await expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["exercises"] });
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** 403 on save (stale row): fixed pt-BR copy, no English, the dialog stays open. */
export const SaveForbidden: Story = {
  decorators: [withInvalidateSpy],
  args: {
    exercise: remadaPropria,
    api: {
      create: fn(),
      update: fn(async () => {
        throw new ApiError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE }, 403);
      }),
      remove: fn(),
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    const submit = canvas.getByRole("button", { name: "Salvar alterações" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await expect(
      await canvas.findByText("Você não tem permissão para alterar este exercício"),
    ).toBeVisible();
    await expect(document.body).not.toHaveTextContent(FORBIDDEN_MESSAGE);
    await expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["exercises"] });
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
