import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
import { ProfileContent } from "./ProfileContent";
import { withSeededQueries } from "@/components/domain/storyQuery";
import { ApiError } from "@/lib/api/client";
import type { Me } from "@/lib/api/types";

const trainer: Me = {
  id: 1,
  name: "Ana Ribeiro",
  email: "ana@example.com",
  cpf: "***.***.***-25",
  cref: "012345-G/SP",
  role: "TRAINER",
  consent: {
    termsVersion: "2026-10-draft",
    termsAcceptedAt: "2026-10-14T12:00:00.000Z",
    healthDataVersion: null,
    healthDataConsentAt: null,
  },
};

const client: Me = { ...trainer, id: 2, name: "Marina Costa", cref: "", role: "CLIENT" };

const exportFile = {
  blob: new Blob(['{"formatVersion":1}'], { type: "application/json" }),
  filename: "vertice-dados-2026-10-15.json",
};

function refusal(code: string, status: number, retryAfter?: number) {
  return async () => {
    throw new ApiError({ code, message: "English upstream text" }, status, retryAfter);
  };
}

const meta = {
  component: ProfileContent,
  args: {
    api: {
      updateMe: fn(async (input) => ({ ...trainer, ...input }) as Me),
      exportMyData: fn(async () => exportFile),
      saveFile: fn(),
      deleteAccount: {
        deleteAccount: fn(async () => undefined),
        logout: fn(async () => undefined),
        leave: fn(),
      },
    },
  },
  decorators: [withSeededQueries({ '["me"]': trainer })],
} satisfies Meta<typeof ProfileContent>;

export default meta;
type Story = StoryObj<typeof meta>;

type Canvas = ReturnType<typeof within>;
const saveButton = (canvas: Canvas) => canvas.getByRole("button", { name: "Salvar alterações" });

/** A trainer's profile: their data, the CPF only as the masked hint, CREF, export and delete. */
export const Trainer: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Meu perfil" })).toBeVisible();
    await expect(canvas.getByLabelText("Nome")).toHaveValue("Ana Ribeiro");
    await expect(canvas.getByLabelText("E-mail")).toHaveValue("ana@example.com");
    await expect(
      canvas.getByText("A troca vale na hora: o novo e-mail passa a ser o seu login, sem confirmação."),
    ).toBeVisible();
    // The masked CPF is shown, never put in a field.
    await expect(canvas.getByLabelText("Novo CPF")).toHaveValue("");
    await expect(canvas.getByText(/CPF cadastrado: \*\*\*\.\*\*\*\.\*\*\*-25/)).toBeVisible();
    await expect(canvas.getByLabelText("CREF (opcional)")).toHaveValue("012345-G/SP");
    await expect(saveButton(canvas)).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "Exportar meus dados" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "Excluir conta" })).toBeEnabled();
  },
};

/** CREF is a trainer's only. */
export const Client: Story = {
  decorators: [withSeededQueries({ '["me"]': client })],
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Nome")).toHaveValue("Marina Costa");
    await expect(canvas.queryByLabelText("CREF (opcional)")).toBeNull();
  },
};

/** `me` still loading. */
export const Loading: Story = {
  decorators: [withSeededQueries({}, { pending: ['["me"]'] })],
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Carregando...")).toBeVisible();
    await expect(canvas.queryByLabelText("Nome")).toBeNull();
  },
};

/** Only the edited field goes in the PATCH, and never the masked CPF. */
export const SavesOnlyChangedFields: Story = {
  play: async ({ canvas, userEvent, args }) => {
    const name = canvas.getByLabelText("Nome");
    await userEvent.clear(name);
    await userEvent.type(name, "Ana R. Ribeiro");
    await userEvent.click(saveButton(canvas));
    await waitFor(() => expect(args.api!.updateMe).toHaveBeenCalledWith({ name: "Ana R. Ribeiro" }));
    await expect(await canvas.findByRole("status")).toHaveTextContent("Perfil atualizado");
    await expect(saveButton(canvas)).toBeDisabled();
  },
};

/** A typed CPF goes as digits; the masked one never does. */
export const ChangesCpf: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText("Novo CPF"), "52998224725");
    await expect(canvas.getByLabelText("Novo CPF")).toHaveValue("529.982.247-25");
    await userEvent.click(saveButton(canvas));
    await waitFor(() => expect(args.api!.updateMe).toHaveBeenCalledWith({ cpf: "52998224725" }));
  },
};

/** An invalid CPF is caught before anything is sent. */
export const InvalidCpf: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.type(canvas.getByLabelText("Novo CPF"), "11111111111");
    await userEvent.click(saveButton(canvas));
    await expect(await canvas.findByText("CPF inválido")).toBeVisible();
    await expect(args.api!.updateMe).not.toHaveBeenCalled();
  },
};

/** 409 CONFLICT: the pt-BR copy (which never says whether the email or the CPF is taken). */
export const EmailTaken: Story = {
  args: {
    api: { ...meta.args.api, updateMe: fn(refusal("CONFLICT", 409)) },
  },
  play: async ({ canvas, userEvent }) => {
    const email = canvas.getByLabelText("E-mail");
    await userEvent.clear(email);
    await userEvent.type(email, "outra@example.com");
    await userEvent.click(saveButton(canvas));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("E-mail ou CPF já cadastrado");
    await expect(canvas.queryByText("English upstream text")).toBeNull();
  },
};

/** "Exportar meus dados" hands the BFF's file, with its name, to the browser. */
export const ExportDownloads: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Exportar meus dados" }));
    await waitFor(() => expect(args.api!.saveFile).toHaveBeenCalledWith(exportFile));
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

/** 429 past the hourly export limit: when to try again, from Retry-After. */
export const ExportRateLimited: Story = {
  args: {
    api: { ...meta.args.api, exportMyData: fn(refusal("RATE_LIMITED", 429, 2400)) },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Exportar meus dados" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Limite de exportações atingido. Tente novamente em 40 minutos.",
    );
    await expect(args.api!.saveFile).not.toHaveBeenCalled();
  },
};

/** 413 TOO_LARGE: no truncated file, and its own copy. */
export const ExportTooLarge: Story = {
  args: {
    api: { ...meta.args.api, exportMyData: fn(refusal("TOO_LARGE", 413)) },
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Exportar meus dados" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Seus dados passam do limite da exportação automática.",
    );
  },
};

/** "Excluir conta" opens the confirmation dialog; "Cancelar" closes it. */
export const OpensDeleteDialog: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Excluir conta" }));
    const dialog = await canvas.findByRole("dialog");
    await expect(within(dialog).getByRole("heading", { name: "Excluir conta?" })).toBeVisible();
    await expect(within(dialog).getByRole("button", { name: "Excluir conta" })).toBeDisabled();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    await expect(canvas.queryByRole("dialog")).toBeNull();
  },
};
