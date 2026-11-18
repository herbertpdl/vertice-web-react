import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert, SearchX } from "lucide-react";
import { expect, fn } from "storybook/test";
import { Badge } from "../Badge";
import { Button } from "../Button";
import { Pagination } from "../Pagination";
import { DataTable, DataTableMessage, type DataTableColumn } from "./DataTable";

interface Row {
  id: number;
  name: string;
  email: string;
  role: string;
}

const rows: Row[] = [
  { id: 1, name: "Ana Ribeiro", email: "ana.ribeiro@email.com", role: "Treinador" },
  { id: 2, name: "Marina Costa", email: "marina.costa@email.com", role: "Aluno" },
  { id: 3, name: "Rafael Torres", email: "rafael.torres@email.com", role: "Treinador" },
];

const columns: DataTableColumn<Row>[] = [
  {
    key: "name",
    header: "Nome",
    width: 240,
    cell: (row) => <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">{row.name}</span>,
  },
  {
    key: "email",
    header: "E-mail",
    cell: (row) => <span className="truncate text-[12px] text-[color:var(--color-text-secondary)]">{row.email}</span>,
  },
  {
    key: "role",
    header: "Papel",
    width: 110,
    cell: (row) => <Badge variant={row.role === "Treinador" ? "info" : "neutral"}>{row.role}</Badge>,
  },
  {
    key: "link",
    header: "",
    width: 90,
    align: "end",
    cell: () => <span className="text-[12px] font-semibold text-[color:var(--color-primary)]">Ver perfil</span>,
  },
];

const footer = (
  <Pagination
    pageSize={10}
    pageSizes={[10, 25, 50]}
    onPageSizeChange={fn()}
    range={{ from: 1, to: 3 }}
    hasPrev={false}
    hasNext={false}
    onPrev={fn()}
    onNext={fn()}
  />
);

const meta = {
  component: DataTable<Row>,
  args: {
    label: "Usuários",
    columns,
    rows,
    rowKey: (row: Row) => row.id,
    mobileRow: (row: Row) => (
      <div className="flex flex-col gap-[4px] px-[14px] py-[12px]">
        <span className="text-[13px] font-semibold text-[color:var(--color-text-primary)]">{row.name}</span>
        <span className="text-[11px] text-[color:var(--color-text-secondary)]">{row.email}</span>
      </div>
    ),
    footer,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[1160px] p-[16px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DataTable<Row>>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Head row, rows and the paging footer. */
export const Loaded: Story = {
  play: async ({ canvas }) => {
    const table = canvas.getByRole("table", { name: "Usuários" });
    await expect(table).toBeVisible();
    await expect(canvas.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "Nome",
      "E-mail",
      "Papel",
      "",
    ]);
    await expect(canvas.getAllByRole("row")).toHaveLength(4);
    await expect(canvas.getByText("1–3")).toBeVisible();
  },
};

/** Skeleton rows (`TableRowSkeleton`) under the head row. */
export const Loading: Story = {
  args: { rows: undefined, loading: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Carregando")).toHaveAttribute("aria-busy", "true");
    await expect(canvas.queryByText("Ana Ribeiro")).toBeNull();
  },
};

/** The empty slot. */
export const Empty: Story = {
  args: {
    rows: [],
    footer: undefined,
    empty: (
      <DataTableMessage
        icon={SearchX}
        title='Nenhum usuário encontrado para "joaquim"'
        description="Confira o nome ou o e-mail, ou limpe os filtros."
        action={<Button variant="outline">Limpar filtros</Button>}
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("status")).toHaveTextContent('Nenhum usuário encontrado para "joaquim"');
    await expect(canvas.getByRole("button", { name: "Limpar filtros" })).toBeVisible();
  },
};

/** The error slot, announced. */
export const ErrorState: Story = {
  args: {
    footer: undefined,
    error: (
      <DataTableMessage
        role="alert"
        icon={CircleAlert}
        title="Não foi possível carregar os usuários"
        description="Verifique sua conexão e tente novamente."
        action={<Button variant="outline">Tentar novamente</Button>}
      />
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("alert")).toHaveTextContent("Não foi possível carregar os usuários");
    await expect(canvas.queryByText("Ana Ribeiro")).toBeNull();
  },
};

const phone = { viewport: { value: "mobile1", isRotated: false } };

/** On a phone the rows stack into `mobileRow` items, with no head row. */
export const PhoneStacking: Story = {
  globals: phone,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("list", { name: "Usuários" })).toBeVisible();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    await expect(canvas.queryByRole("table")).toBeNull();
  },
};
