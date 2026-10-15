import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";
import { LegalDocument, LegalSection } from "./LegalDocument";
import { LEGAL_TEXT_DATE, LEGAL_VERSIONS } from "@/lib/legal/versions";

const meta = {
  component: LegalDocument,
  parameters: { layout: "fullscreen" },
  args: {
    title: "Política de Privacidade",
    version: LEGAL_VERSIONS.terms,
    date: LEGAL_TEXT_DATE,
    children: (
      <>
        <LegalSection title="1. Quem trata os seus dados">
          <p>
            Esta política explica como a Vertice trata dados pessoais, nos termos da LGPD. Para os
            dados da conta do treinador, a Vertice é a <strong>controladora</strong>.
          </p>
        </LegalSection>
        <LegalSection title="2. Dados que coletamos e para quê">
          <ul>
            <li>
              <strong>Cadastro:</strong> nome e e-mail, para identificar você e permitir o login.
            </li>
            <li>
              <strong>Senha:</strong> guardada apenas como um hash.
            </li>
          </ul>
        </LegalSection>
      </>
    ),
  },
} satisfies Meta<typeof LegalDocument>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The draft banner, the version and date, the sections, and the legal links in the footer. */
export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("note")).toHaveTextContent("Rascunho — sujeito a revisão jurídica.");
    await expect(canvas.getByRole("heading", { level: 1, name: "Política de Privacidade" })).toBeVisible();
    await expect(canvas.getByText(`Versão ${LEGAL_VERSIONS.terms} · ${LEGAL_TEXT_DATE}`)).toBeVisible();
    await expect(canvas.getByRole("heading", { level: 2, name: "1. Quem trata os seus dados" })).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Termos de Uso" })).toHaveAttribute("href", "/termos");
  },
};
