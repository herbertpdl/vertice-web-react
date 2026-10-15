import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fireEvent, fn, waitFor, within } from "storybook/test";
import { EditStudentDialog } from "./EditStudentDialog";
import { ApiError } from "@/lib/api/client";
import { newStudent } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";

const meta = {
  component: EditStudentDialog,
  args: {
    student: newStudent,
    onClose: fn(),
    api: { update: fn(async () => newStudent) },
  },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof EditStudentDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const body = () => within(document.body);
const save = () => body().getByRole("button", { name: "Salvar" });

/** The masked CPF is a hint, never a field value; saving untouched sends no `cpf`. */
export const KeepsCpfWhenUntouched: Story = {
  play: async ({ userEvent, args }) => {
    const cpf = body().getByLabelText("Novo CPF");
    await expect(cpf).toHaveValue("");
    await expect(body().getByText(/CPF cadastrado: \*\*\*\.\*\*\*\.\*\*\*-25/)).toBeVisible();

    const name = body().getByLabelText("Nome completo");
    await userEvent.clear(name);
    await userEvent.type(name, "Marina Souza");
    // Typing keeps the focus in the field (Dialog no longer refocuses on each render).
    await expect(name).toHaveFocus();
    await userEvent.click(save());
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(args.api!.update).toHaveBeenCalledWith(newStudent.id, {
      name: "Marina Souza",
      email: newStudent.email,
    });
  },
};

/** A typed CPF goes as digits. */
export const SendsTypedCpf: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.type(body().getByLabelText("Novo CPF"), "52998224725");
    await expect(body().getByLabelText("Novo CPF")).toHaveValue("529.982.247-25");
    await userEvent.click(save());
    await waitFor(() =>
      expect(args.api!.update).toHaveBeenCalledWith(newStudent.id, {
        name: newStudent.name,
        email: newStudent.email,
        cpf: "52998224725",
      }),
    );
  },
};

/** "Remover o CPF cadastrado" sends `cpf: null`. */
export const RemovesCpf: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.click(body().getByText("Remover o CPF cadastrado"));
    await expect(body().getByLabelText("Novo CPF")).toBeDisabled();
    await userEvent.click(save());
    await waitFor(() =>
      expect(args.api!.update).toHaveBeenCalledWith(newStudent.id, {
        name: newStudent.name,
        email: newStudent.email,
        cpf: null,
      }),
    );
  },
};

/** A client without a CPF: nothing to remove. */
export const WithoutCpf: Story = {
  args: { student: { ...newStudent, cpf: "" } },
  play: async () => {
    await expect(body().getByText("Nenhum CPF cadastrado.")).toBeVisible();
    await expect(body().queryByText("Remover o CPF cadastrado")).toBeNull();
  },
};

/** An invalid CPF is caught before any call. */
export const InvalidCpf: Story = {
  play: async ({ userEvent, args }) => {
    await userEvent.type(body().getByLabelText("Novo CPF"), "11111111111");
    await userEvent.click(save());
    await expect(await body().findByText("CPF inválido")).toBeVisible();
    await expect(args.api!.update).not.toHaveBeenCalled();
  },
};

/** 409 CONFLICT: the email or the CPF is taken; pt-BR copy on the email, the dialog stays. */
export const Conflict: Story = {
  args: {
    api: {
      update: fn(async () => {
        throw new ApiError({ code: "CONFLICT", message: "Email or CPF already in use" }, 409);
      }),
    },
  },
  play: async ({ userEvent, args }) => {
    await userEvent.click(save());
    await expect(await body().findByText("E-mail ou CPF já cadastrado")).toBeVisible();
    await expect(body().queryByText("Email or CPF already in use")).toBeNull();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

/** 400 VALIDATION_ERROR: the code's copy, not the BFF's message. */
export const ValidationError: Story = {
  args: {
    api: {
      update: fn(async () => {
        throw new ApiError({ code: "VALIDATION_ERROR", message: "Invalid request" }, 400);
      }),
    },
  },
  play: async ({ userEvent }) => {
    await userEvent.click(save());
    await expect(await body().findByRole("alert")).toHaveTextContent(
      "Alguns dados não foram aceitos. Revise e tente novamente.",
    );
  },
};

/** A save that stays in flight until the story releases it. */
let release: () => void = () => {};
const heldUpdate = fn(
  () =>
    new Promise<typeof newStudent>((resolve) => {
      release = () => resolve(newStudent);
    }),
);

/** Enter, then a click while the save is pending: one PATCH. */
export const SubmitsOnce: Story = {
  args: { api: { update: heldUpdate } },
  beforeEach: () => {
    heldUpdate.mockClear();
  },
  play: async ({ userEvent, args }) => {
    await userEvent.type(body().getByLabelText("Nome completo"), "{Enter}");
    // Pending: the button is disabled, and a click on it or a second Enter changes nothing.
    await expect(save()).toBeDisabled();
    await fireEvent.click(save());
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(heldUpdate).toHaveBeenCalledTimes(1));
    release();
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(heldUpdate).toHaveBeenCalledTimes(1);
  },
};

/** Two submits in the same tick, before `isPending` renders: the submitting ref keeps it to one PATCH. */
export const SameTickDoubleSubmitPatchesOnce: Story = {
  args: { api: { update: heldUpdate } },
  beforeEach: () => {
    heldUpdate.mockClear();
  },
  play: async ({ args }) => {
    const form = body().getByRole("button", { name: "Salvar" }).closest("form")!;
    form.requestSubmit();
    form.requestSubmit();
    // react-hook-form validates asynchronously before calling the submit handler.
    await waitFor(() => expect(heldUpdate).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    await expect(heldUpdate).toHaveBeenCalledTimes(1);
    release();
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(heldUpdate).toHaveBeenCalledTimes(1);
  },
};
