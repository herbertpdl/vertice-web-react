import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/layout/LegalDocument";
import { LEGAL_CONTACT_PLACEHOLDER, LEGAL_TEXT_DATE, LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = { title: "Política de Privacidade — Vertice" };

const linkClass = "font-semibold text-[color:var(--color-primary)]";

// DRAFT (P1-04), written from vertice-api's docs/data-inventory.md (D1–D6 and the inventory by
// table), all pending legal review. Not final legal text: change it only together with
// LEGAL_VERSIONS.terms (the Terms of Use and this policy are accepted together).
export default function PrivacyPage() {
  return (
    <LegalDocument
      title="Política de Privacidade"
      version={LEGAL_VERSIONS.terms}
      date={LEGAL_TEXT_DATE}
    >
      <LegalSection title="1. Quem trata os seus dados">
        <p>
          Esta política explica como a Vertice trata dados pessoais, nos termos da Lei Geral de
          Proteção de Dados (Lei nº 13.709/2018, LGPD). Ela complementa os{" "}
          <Link href="/termos" className={linkClass}>
            Termos de Uso
          </Link>
          .
        </p>
        <ul>
          <li>
            <strong>Dados da conta do treinador:</strong> a Vertice é a controladora.
          </li>
          <li>
            <strong>Dados dos alunos</strong> (cadastro, planos, registros de treino e feedback): o
            treinador do aluno é o controlador e a Vertice é a operadora, tratando os dados em nome
            dele.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos e para quê">
        <ul>
          <li>
            <strong>Cadastro:</strong> nome e e-mail, para identificar você, permitir o login e
            enviar o link de primeiro acesso.
          </li>
          <li>
            <strong>CPF:</strong> obrigatório para treinadores (identificação, verificação do CREF
            e faturamento). Para alunos é opcional e só é guardado se o treinador o informar.
          </li>
          <li>
            <strong>CREF</strong> (opcional): mostrar que o treinador é um profissional registrado.
          </li>
          <li>
            <strong>Senha:</strong> guardada apenas como um hash (bcrypt); nunca temos acesso à
            senha em si.
          </li>
          <li>
            <strong>Registro de aceite:</strong> a versão destes textos que você aceitou e quando,
            para comprovar o aceite.
          </li>
          <li>
            <strong>Vínculo treinador–aluno:</strong> quem treina quem e desde quando, para montar
            a lista de alunos e controlar quem pode ver o quê.
          </li>
          <li>
            <strong>Planos e treinos:</strong> exercícios, séries, cargas, repetições, descansos e
            observações prescritos pelo treinador.
          </li>
          <li>
            <strong>Registros de treino e feedback:</strong> quando o aluno treinou, as cargas e
            repetições que fez e o texto de feedback que enviou ao treinador, para acompanhar a
            evolução.
          </li>
          <li>
            <strong>Registros de acesso:</strong> os servidores registram dados técnicos das
            requisições (como endereço IP e identificadores de usuário) para segurança e
            diagnóstico.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Bases legais">
        <ul>
          <li>
            <strong>Execução de contrato</strong> (LGPD art. 7º, V) para os dados da conta e para
            prestar o serviço de acompanhamento de treino.
          </li>
          <li>
            <strong>Consentimento específico</strong> (LGPD art. 11, I) para os dados relacionados
            à saúde, descritos abaixo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Dados relacionados à saúde">
        <p>
          Cargas, registros de treino e o texto de feedback (que pode mencionar dor, lesão ou
          esforço) revelam a condição física do aluno e são tratados como dados sensíveis. Pedimos
          o consentimento do aluno para esse tratamento no primeiro acesso ao aplicativo do aluno,
          e registramos a versão consentida e a data. O aluno pode revogar o consentimento pelo
          e-mail de contato; sem ele, não é possível registrar treinos na plataforma.
        </p>
      </LegalSection>

      <LegalSection title="5. Quem pode ver os seus dados">
        <ul>
          <li>Os dados de um aluno são vistos pelo próprio aluno e pelo treinador dele.</li>
          <li>
            Um número restrito de administradores da Vertice pode acessá-los para suporte e
            segurança.
          </li>
          <li>
            O CPF do aluno aparece mascarado para o treinador, que só o vê completo quando pede, e
            cada consulta é registrada.
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os usamos para publicidade.</p>
      </LegalSection>

      <LegalSection title="6. Operadores e compartilhamento">
        <p>
          Hoje a Vertice não usa outros fornecedores que tratem dados pessoais além do provedor de
          hospedagem da plataforma. Se isso mudar, esta política será atualizada antes.
        </p>
      </LegalSection>

      <LegalSection title="7. Por quanto tempo guardamos">
        <ul>
          <li>
            Os dados da conta, dos planos, dos registros de treino e do feedback são mantidos
            enquanto a conta estiver ativa. Quando a conta é excluída, seus dados pessoais são
            excluídos ou anonimizados.
          </li>
          <li>Os registros de acesso dos servidores são mantidos por 30 dias.</li>
          <li>
            Os links de primeiro acesso valem até serem usados, expirarem ou serem substituídos
            por um novo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          Usamos apenas um cookie, essencial: o cookie de sessão que mantém você conectado depois
          do login. Ele é inacessível a scripts da página e é apagado ao sair. Não usamos cookies
          de análise nem de publicidade.
        </p>
      </LegalSection>

      <LegalSection title="9. Seus direitos">
        <p>Pela LGPD (art. 18), você pode pedir, a qualquer momento:</p>
        <ul>
          <li>a confirmação de que tratamos os seus dados e o acesso a eles;</li>
          <li>a correção de dados incompletos, inexatos ou desatualizados;</li>
          <li>
            a anonimização, o bloqueio ou a eliminação de dados desnecessários, excessivos ou
            tratados em desconformidade com a lei;
          </li>
          <li>a portabilidade dos seus dados a outro fornecedor;</li>
          <li>a eliminação dos dados tratados com base no seu consentimento;</li>
          <li>a informação sobre com quem compartilhamos os seus dados;</li>
          <li>a informação sobre a possibilidade de não consentir e as consequências disso;</li>
          <li>a revogação do consentimento.</li>
        </ul>
        <p>
          Para exercer esses direitos, use a página Meu perfil ou o e-mail de contato. Se você é
          aluno, também pode fazer o pedido ao seu treinador, que é o controlador dos seus dados;
          nós o apoiaremos no atendimento.
        </p>
      </LegalSection>

      <LegalSection title="10. Segurança">
        <p>
          A comunicação com a plataforma é criptografada, as senhas são guardadas apenas como hash
          e cada usuário só acessa os dados que lhe dizem respeito.
        </p>
      </LegalSection>

      <LegalSection title="11. Mudanças nesta política">
        <p>
          Quando esta política mudar, publicaremos uma nova versão nesta página e pediremos o seu
          aceite no próximo acesso.
        </p>
      </LegalSection>

      <LegalSection title="12. Contato e encarregado">
        <p>
          Pedidos e dúvidas sobre privacidade, incluindo o contato com o encarregado pelo
          tratamento de dados: {LEGAL_CONTACT_PLACEHOLDER}.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
