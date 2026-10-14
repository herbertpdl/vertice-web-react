import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn } from "storybook/test";
import { StudentAccessLink } from "./StudentAccessLink";
import { studentSetup } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";
import { ApiError } from "@/lib/api/client";

const meta = {
  component: StudentAccessLink,
  args: { studentId: 42, setup: studentSetup, issueToken: fn(async () => studentSetup) },
  decorators: [withSeededQueries({})],
} satisfies Meta<typeof StudentAccessLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Right after `POST /clients`: the link, a copy button and the expiry. */
export const WithLink: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByLabelText("Link de acesso");
    await expect(input).toHaveValue(
      `${window.location.origin}/definir-senha?token=${studentSetup.token}`,
    );
    await expect(canvas.getByRole("button", { name: "Copiar" })).toBeVisible();
    await expect(canvas.getByText(/^Expira em /)).toBeVisible();
  },
};

/** No token yet (`setup: null`, or from the student page): "Gerar link de acesso" issues one. */
export const Generate: Story = {
  args: { setup: null },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Gerar link de acesso" }));
    await expect(args.issueToken).toHaveBeenCalledWith(42);
    await expect(await canvas.findByLabelText("Link de acesso")).toHaveValue(
      `${window.location.origin}/definir-senha?token=${studentSetup.token}`,
    );
  },
};

/** 409 PRECONDITION_FAILED: the client has a password (possibly a legacy random one). */
export const AlreadyHasPassword: Story = {
  args: {
    setup: null,
    issueToken: fn(async () => {
      throw new ApiError(
        { code: "PRECONDITION_FAILED", message: "Client already has a password" },
        409,
      );
    }),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Gerar link de acesso" }));
    await expect(await canvas.findByText(/Este aluno já tem uma senha cadastrada/)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Gerar link de acesso" })).toBeNull();
  },
};

export const RateLimited: Story = {
  args: {
    setup: null,
    issueToken: fn(async () => {
      throw new ApiError({ code: "RATE_LIMITED", message: "Too many requests" }, 429, 120);
    }),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Gerar link de acesso" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Muitas tentativas. Tente novamente em 2 minutos.",
    );
  },
};
