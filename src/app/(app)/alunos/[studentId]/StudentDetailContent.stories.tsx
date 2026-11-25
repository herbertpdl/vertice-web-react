import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, fn, waitFor, within } from "storybook/test";
import { StudentDetailContent } from "./StudentDetailContent";
import { SAVED_AT, installAnamneseServer, savedText } from "./anamneseStoryServer";
import { newStudent } from "@/components/domain/storyFixtures";
import { withSeededQueries } from "@/components/domain/storyQuery";
import type { StudentDetailOverview } from "@/lib/api/types";

const overview: StudentDetailOverview = {
  student: newStudent,
  activePlan: null,
  thisWeek: { completed: 0, total: 0 },
  lastWorkoutAt: null,
  adherence4Weeks: null,
};

const replace = fn();
const push = fn();

const meta = {
  component: StudentDetailContent,
  args: { studentId: 42, initialTab: "anamnese" },
  decorators: [
    withSeededQueries({
      '["student",42,"overview"]': overview,
      '["feedback"]': [],
      '["trainingPlans",{"clientId":42}]': [],
      '["student",42,"anamnese"]': { text: savedText, updatedAt: SAVED_AT },
      '["assistantStatus"]': { enabled: true },
    }),
  ],
  parameters: { layout: "fullscreen" },
  // Pages-router decorator plus a stubbed `useRouter`: see WorkoutEditorSession.stories.tsx.
  beforeEach: () => {
    replace.mockClear();
    push.mockClear();
    useRouter.mockReturnValue({
      back: fn(),
      forward: fn(),
      refresh: fn(),
      hmrRefresh: fn(),
      push,
      replace,
      prefetch: fn(),
    } as unknown as ReturnType<typeof useRouter>);
    return installAnamneseServer();
  },
} satisfies Meta<typeof StudentDetailContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** R9, R28: `?aba=anamnese` opens the tab, which sits beside the other three. */
export const OpensOnAnamnese: Story = {
  play: async ({ canvas }) => {
    for (const label of ["Planos de treino", "Feedbacks", "Progresso de carga", "Anamnese"]) {
      await expect(canvas.getByRole("button", { name: label })).toBeVisible();
    }
    await expect(canvas.getByRole("button", { name: "Anamnese" })).toHaveAttribute("aria-current", "page");
    await expect(canvas.getByLabelText("Anamnese de Marina Costa")).toHaveValue(savedText);
  },
};

/** Spec D1: switching tabs with nothing unsaved goes at once and rewrites `?aba=` without history. */
export const SwitchWhenClean: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Planos de treino" }));
    await expect(canvas.queryByRole("dialog")).toBeNull();
    await expect(replace).toHaveBeenCalledWith("/alunos/42", { scroll: false });
    await expect(canvas.queryByLabelText("Anamnese de Marina Costa")).toBeNull();
  },
};

/** E3, R15, frame `QSfhj`: a tab switch with unsaved changes asks; "Continuar editando" keeps the text. */
export const SwitchWithUnsavedChanges: Story = {
  play: async ({ canvas, userEvent }) => {
    const box = canvas.getByLabelText("Anamnese de Marina Costa");
    await userEvent.type(box, " mais");
    await userEvent.click(canvas.getByRole("button", { name: "Planos de treino" }));
    const body = within(document.body);
    const dialog = await body.findByRole("dialog");
    await expect(within(dialog).getByText("Sair sem salvar a anamnese?")).toBeVisible();
    await expect(
      within(dialog).getByText(
        "Você mudou a anamnese de Marina Costa e ainda não salvou. Se sair agora, essas mudanças serão perdidas.",
      ),
    ).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Continuar editando" }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await expect(canvas.getByLabelText("Anamnese de Marina Costa")).toHaveValue(`${savedText} mais`);
    await expect(replace).not.toHaveBeenCalled();

    await userEvent.click(canvas.getByRole("button", { name: "Feedbacks" }));
    await userEvent.click(within(await body.findByRole("dialog")).getByRole("button", { name: "Sair sem salvar" }));
    await waitFor(() => expect(canvas.queryByLabelText("Anamnese de Marina Costa")).toBeNull());
    await expect(replace).toHaveBeenCalledWith("/alunos/42?aba=feedbacks", { scroll: false });
  },
};

/** R15, spec D6: an in-app link with unsaved changes asks first, then navigates on "Sair sem salvar". */
export const LinkWithUnsavedChanges: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Anamnese de Marina Costa"), " mais");
    await userEvent.click(canvas.getByRole("link", { name: "Alunos" }));
    const dialog = await within(document.body).findByRole("dialog");
    await expect(push).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Sair sem salvar" }));
    await expect(push).toHaveBeenCalledWith("/alunos");
  },
};

/** Q9: "Encerrar acompanhamento" with unsaved changes asks before its own dialog. */
export const EndRelationshipWithUnsavedChanges: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.type(canvas.getByLabelText("Anamnese de Marina Costa"), " mais");
    await userEvent.click(canvas.getByRole("button", { name: "Encerrar acompanhamento" }));
    const body = within(document.body);
    await userEvent.click(within(await body.findByRole("dialog")).getByRole("button", { name: "Sair sem salvar" }));
    await waitFor(() => expect(body.queryByText("Sair sem salvar a anamnese?")).toBeNull());
    await expect(await body.findByRole("dialog")).toBeVisible();
  },
};
