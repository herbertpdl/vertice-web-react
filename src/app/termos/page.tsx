import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/layout/LegalDocument";
import { LEGAL_CONTACT_PLACEHOLDER, LEGAL_TEXT_DATE, LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = { title: "Termos de Uso — Vertice" };

const linkClass = "font-semibold text-[color:var(--color-primary)]";

// DRAFT (P1-04), written from vertice-api's docs/data-inventory.md decisions D1–D6, all pending
// legal review. Not final legal text: change it only together with LEGAL_VERSIONS.terms.
export default function TermsPage() {
  return (
    <LegalDocument title="Termos de Uso" version={LEGAL_VERSIONS.terms} date={LEGAL_TEXT_DATE}>
      <LegalSection title="1. Sobre estes termos">
        <p>
          Estes Termos de Uso regem o uso da Vertice, uma plataforma para treinadores organizarem
          alunos, planos de treino e o acompanhamento da evolução de cada aluno. Ao criar uma conta
          ou aceitar estes termos no primeiro acesso, você concorda com eles e com a{" "}
          <Link href="/privacidade" className={linkClass}>
            Política de Privacidade
          </Link>
          , que explica como tratamos dados pessoais.
        </p>
      </LegalSection>

      <LegalSection title="2. Quem pode usar">
        <ul>
          <li>
            <strong>Treinadores</strong> criam a própria conta pelo cadastro, informando nome,
            e-mail, CPF e, opcionalmente, o CREF.
          </li>
          <li>
            <strong>Alunos</strong> são cadastrados pelo seu treinador e definem a própria senha
            pelo link de primeiro acesso que o treinador compartilha.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Sua conta">
        <p>
          Você é responsável por manter seus dados de cadastro corretos e sua senha em sigilo. Tudo
          o que for feito com a sua conta é considerado feito por você. Se suspeitar de uso
          indevido, troque a senha e fale conosco.
        </p>
      </LegalSection>

      <LegalSection title="4. Papéis no tratamento de dados">
        <p>
          Para os dados da própria conta do treinador, a Vertice é a <strong>controladora</strong>.
          Para os dados dos alunos (cadastro, planos, registros de treino e feedback), o{" "}
          <strong>treinador é o controlador</strong> e a Vertice atua como{" "}
          <strong>operadora</strong>, tratando esses dados em nome do treinador e conforme as
          instruções dele.
        </p>
      </LegalSection>

      <LegalSection title="5. Responsabilidades do treinador">
        <ul>
          <li>
            Cadastrar alunos apenas com o conhecimento deles e informá-los sobre o uso da Vertice
            e sobre esta política.
          </li>
          <li>
            Usar os dados dos alunos somente para prestar o serviço de acompanhamento de treino.
          </li>
          <li>
            Responder pelo conteúdo dos planos e orientações que prescreve. A Vertice é uma
            ferramenta de organização e não presta serviço de saúde nem avalia as prescrições.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="6. Uso permitido">
        <p>
          Não é permitido usar a plataforma para fins ilícitos, tentar acessar dados de outros
          usuários, interferir no funcionamento do serviço ou automatizar acessos em volume
          abusivo.
        </p>
      </LegalSection>

      <LegalSection title="7. Disponibilidade e alterações do serviço">
        <p>
          Trabalhamos para manter a plataforma disponível, mas ela pode passar por interrupções
          para manutenção ou por falhas. Funcionalidades podem ser alteradas, incluídas ou
          removidas.
        </p>
      </LegalSection>

      <LegalSection title="8. Encerramento da conta">
        <p>
          Você pode pedir o encerramento da sua conta a qualquer momento pelo e-mail de contato
          (uma página de perfil para fazer isso no próprio aplicativo virá em breve). Ao encerrar a conta, os dados pessoais dela são excluídos ou
          anonimizados, como descrito na Política de Privacidade.
        </p>
      </LegalSection>

      <LegalSection title="9. Mudanças nestes termos">
        <p>
          Quando estes termos ou a Política de Privacidade mudarem, publicaremos uma nova versão
          nesta página e pediremos o seu aceite no próximo acesso. A versão em vigor é a indicada
          no topo da página.
        </p>
      </LegalSection>

      <LegalSection title="10. Contato">
        <p>Dúvidas sobre estes termos: {LEGAL_CONTACT_PLACEHOLDER}.</p>
      </LegalSection>
    </LegalDocument>
  );
}
