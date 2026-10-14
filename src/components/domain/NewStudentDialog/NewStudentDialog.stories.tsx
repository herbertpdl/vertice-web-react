import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, within } from "storybook/test";
import { NewStudentDialog } from "./NewStudentDialog";
import { newStudent, studentSetup } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";

const meta = {
  component: NewStudentDialog,
  args: {
    onClose: fn(),
    api: {
      create: fn(async () => ({ ...newStudent, setup: studentSetup })),
      issueToken: fn(async () => studentSetup),
    },
  },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof NewStudentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fillAndSubmit(userEvent: Parameters<NonNullable<Story["play"]>>[0]["userEvent"]) {
  const body = within(document.body);
  await userEvent.type(body.getByLabelText("Nome completo"), "Marina Costa");
  await userEvent.type(body.getByLabelText("Email"), "marina@email.com");
  await userEvent.type(body.getByLabelText("CPF"), "52998224725");
  await userEvent.click(body.getByRole("button", { name: "Criar aluno" }));
}

export const Form: Story = {
  play: async () => {
    const body = within(document.body);
    await expect(body.getByRole("heading", { name: "Novo aluno" })).toBeVisible();
  },
};

/** After creation the dialog shows the first-access link to share, not close. */
export const CreatedShowsLink: Story = {
  play: async ({ userEvent, args }) => {
    const body = within(document.body);
    await fillAndSubmit(userEvent);
    await expect(args.api!.create).toHaveBeenCalledWith({
      name: "Marina Costa",
      email: "marina@email.com",
      cpf: "52998224725",
    });
    await expect(await body.findByRole("heading", { name: "Aluno criado" })).toBeVisible();
    await expect(body.getByLabelText("Link de acesso")).toHaveValue(
      `${window.location.origin}/definir-senha?token=${studentSetup.token}`,
    );
    await expect(args.onClose).not.toHaveBeenCalled();
    await userEvent.click(body.getByRole("button", { name: "Concluir" }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** `setup: null` (issuing the token failed upstream): offer to generate it. */
export const CreatedWithoutLink: Story = {
  args: {
    api: {
      create: fn(async () => ({ ...newStudent, setup: null })),
      issueToken: fn(async () => studentSetup),
    },
  },
  play: async ({ userEvent, args }) => {
    const body = within(document.body);
    await fillAndSubmit(userEvent);
    await userEvent.click(await body.findByRole("button", { name: "Gerar link de acesso" }));
    await expect(args.api!.issueToken).toHaveBeenCalledWith(newStudent.id);
    await expect(await body.findByLabelText("Link de acesso")).toBeVisible();
  },
};
