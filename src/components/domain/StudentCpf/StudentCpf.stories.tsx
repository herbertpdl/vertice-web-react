import { useState, type ComponentProps } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { QueryClient } from "@tanstack/react-query";
import { expect, fn } from "storybook/test";
import { Button } from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { StudentCpf } from "./StudentCpf";
import { newStudent, newStudentFullCpf } from "../storyFixtures";
import { withSeededQueries } from "../storyQuery";

let queryClient: QueryClient | undefined;

const meta = {
  component: StudentCpf,
  args: {
    studentId: newStudent.id,
    maskedCpf: newStudent.cpf,
    reveal: fn(async () => newStudentFullCpf),
  },
  decorators: [
    withSeededQueries(
      { [JSON.stringify(["student", newStudent.id])]: newStudent },
      { onClient: (client) => (queryClient = client) },
    ),
  ],
} satisfies Meta<typeof StudentCpf>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing in TanStack Query (queries or mutations) holds the full CPF. */
function expectNotCached() {
  for (const query of queryClient!.getQueryCache().getAll()) {
    expect(JSON.stringify(query.state.data) ?? "").not.toContain(newStudentFullCpf);
  }
  expect(queryClient!.getMutationCache().getAll()).toHaveLength(0);
  expect(queryClient!.getQueryData(["student", newStudent.id])).toEqual(newStudent);
}

/** As the BFF sends it: masked, and no reveal request until the trainer asks. */
export const Masked: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("***.***.***-25")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "mostrar" })).toBeVisible();
    await expect(args.reveal).not.toHaveBeenCalled();
  },
};

/** "mostrar" fetches the full CPF into component state only; "ocultar" drops it. */
export const RevealAndHide: Story = {
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(canvas.getByRole("button", { name: "mostrar" }));
    await expect(args.reveal).toHaveBeenCalledWith(newStudent.id);
    await expect(await canvas.findByText(newStudentFullCpf)).toBeVisible();
    expectNotCached();

    await userEvent.click(canvas.getByRole("button", { name: "ocultar" }));
    await expect(canvas.getByText("***.***.***-25")).toBeVisible();
    await expect(canvas.queryByText(newStudentFullCpf)).toBeNull();
    expectNotCached();
  },
};

function LeaveAndReturn(props: ComponentProps<typeof StudentCpf>) {
  const [mounted, setMounted] = useState(true);
  return (
    <div className="flex flex-col items-start gap-2">
      {mounted && <StudentCpf {...props} />}
      <Button type="button" variant="outline" size="sm" onClick={() => setMounted(!mounted)}>
        {mounted ? "Sair da página" : "Voltar à página"}
      </Button>
    </div>
  );
}

/** Leaving the page (unmount) forgets the revealed CPF: coming back shows the mask again. */
export const ReMaskedOnUnmount: Story = {
  render: (args) => <LeaveAndReturn {...args} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "mostrar" }));
    await expect(await canvas.findByText(newStudentFullCpf)).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Sair da página" }));
    await userEvent.click(canvas.getByRole("button", { name: "Voltar à página" }));
    await expect(canvas.getByText("***.***.***-25")).toBeVisible();
    await expect(canvas.queryByText(newStudentFullCpf)).toBeNull();
    expectNotCached();
  },
};

/** A refused reveal (e.g. 403) shows pt-BR copy, never the BFF's English message. */
export const RevealRefused: Story = {
  args: {
    reveal: fn(async () => {
      throw new ApiError(
        { code: "FORBIDDEN", message: "You do not have access to this resource" },
        403,
      );
    }),
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "mostrar" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Você não tem acesso a este recurso.",
    );
    await expect(canvas.getByText("***.***.***-25")).toBeVisible();
  },
};

/** A client with no CPF (`""`): nothing to show or reveal. */
export const NoCpf: Story = {
  args: { maskedCpf: "" },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button", { name: "mostrar" })).toBeNull();
  },
};
