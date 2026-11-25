import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument, LegalSection } from "@/components/layout/LegalDocument";
import { LEGAL_CONTACT_PLACEHOLDER, LEGAL_TEXT_DATE, LEGAL_VERSIONS } from "@/lib/legal/versions";

export const metadata: Metadata = { title: "Política de Privacidade — Vertice" };

const linkClass = "font-semibold text-[color:var(--color-primary)]";

// DRAFT (P1-04), written from vertice-api's docs/data-inventory.md (D1–D6 and the inventory by
// table), all pending legal review. Not final legal text: change it only together with
// LEGAL_VERSIONS.terms (the Terms of Use and this policy are accepted together). One exception:
// the AI workout assistant's text (sections 4, 6 and 7, VRT-44) changed only LEGAL_TEXT_DATE,
// because the AI PRD's §7 decides there is no re-consent; the lawyer's review may reverse that.
// The client anamnese's text (sections 1 to 5 and 7, VRT-57) followed the same precedent: the
// anamnese PRD (vertice-api docs/prds/client-anamnese, R32, R41) asks no new client consent.
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
            <strong>Dados dos alunos</strong> (cadastro, planos, anamnese, registros de treino e
            feedback): o
            treinador do aluno é o controlador e a Vertice é a operadora, tratando os dados em nome
            dele.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Dados que coletamos e para quê">
        <ul>
          <li>
            <strong>Cadastro:</strong> nome e e-mail, para identificar você e permitir o login.
            No caso do aluno, o treinador compartilha com ele o link de primeiro acesso.
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
            <strong>Anamnese:</strong> o histórico de saúde e de treino do aluno (como objetivo,
            histórico de saúde, lesões e dores, medicamentos, limitações, rotina e experiência com
            treino), escrito pelo treinador, para orientar o treinador e o assistente de treino
            com IA ao montar os treinos desse aluno.
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
            à saúde, descritos abaixo, exceto a anamnese.
          </li>
          <li>
            <strong>Anamnese:</strong> é registrada pelo treinador com base própria dele, como
            controlador dos dados dos seus alunos, e não com base no consentimento do aluno.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Dados relacionados à saúde">
        <p>
          Cargas, registros de treino e o texto de feedback (que pode mencionar dor, lesão ou
          esforço) revelam a condição física do aluno e são tratados como dados sensíveis. O
          consentimento do aluno para esse tratamento será pedido no primeiro acesso dele ao
          aplicativo, antes de qualquer registro de treino, e a versão consentida e a data ficarão
          registradas. O aluno pode revogar o consentimento pelo e-mail de contato.
        </p>
        <p>
          A anamnese também é um dado sensível, mas não depende desse consentimento: o treinador a
          registra com base própria dele (seção 3) e pode escrevê-la antes do primeiro acesso do
          aluno.
        </p>
        <p>
          <strong>Assistente de treino com IA:</strong> quando o treinador usa o assistente no
          editor de treinos, a Vertice envia à Anthropic, em nome do treinador, o que o assistente
          precisa para responder: o treino aberto na tela (exercícios, séries, cargas, descansos e
          observações), o nome, a descrição, o nível e as datas do plano, um resumo dos outros
          treinos do plano, os nomes e grupos musculares dos exercícios do catálogo do treinador,
          a anamnese que o treinador escreveu sobre o aluno do plano (quando houver) e a conversa
          com o assistente. Esses dados são enviados apenas para gerar as respostas do
          assistente.
        </p>
        <p>
          Não enviamos o cadastro do aluno (como nome, e-mail ou CPF), nem as cargas que ele
          registrou, os registros de treino ou o feedback dele. Os textos escritos pelo treinador
          (o nome e a descrição do plano, as observações dos exercícios, a anamnese e as mensagens
          ao assistente) são enviados como ele os escreveu; por isso, o treinador deve evitar
          incluir neles o nome ou outros dados que identifiquem o aluno.
        </p>
      </LegalSection>

      <LegalSection title="5. Quem pode ver os seus dados">
        <ul>
          <li>Os dados de um aluno são vistos pelo próprio aluno e pelo treinador dele.</li>
          <li>
            A anamnese é a exceção: só o treinador atual do aluno vê e edita a anamnese que ele
            mesmo escreveu, e nenhum treinador vê a de outro. O aluno não a vê no aplicativo, mas
            ela é incluída na cópia dos dados pessoais que ele pedir.
          </li>
          <li>
            Um número restrito de administradores da Vertice pode acessá-los para suporte e
            segurança, exceto a anamnese, que nenhum administrador vê.
          </li>
          <li>
            O CPF do aluno aparece mascarado para o treinador, que só o vê completo quando pede, e
            cada consulta é registrada.
          </li>
        </ul>
        <p>Não vendemos dados pessoais nem os usamos para publicidade.</p>
      </LegalSection>

      <LegalSection title="6. Operadores e compartilhamento">
        <p>A Vertice usa estes fornecedores, que tratam dados pessoais em nome dela:</p>
        <ul>
          <li>
            <strong>Provedor de hospedagem da plataforma:</strong> guarda e processa os dados para
            que a Vertice funcione.
          </li>
          <li>
            <strong>Anthropic:</strong> fornece o modelo de inteligência artificial do assistente
            de treino. A Vertice envia a ela, apenas quando o treinador usa o assistente, os dados
            descritos na seção 4, para gerar as respostas do assistente. A Anthropic atua como
            suboperadora: a Vertice a contrata para prestar o serviço ao treinador, que continua
            sendo o controlador dos dados dos alunos.
          </li>
        </ul>
        <p>
          O monitoramento técnico do assistente recebe só dados de funcionamento (como tempo de
          resposta, quantidade de tokens processados, erros e a versão das instruções do
          assistente), sem o conteúdo dos treinos nem das mensagens.
        </p>
        <p>Se a lista de fornecedores mudar, esta política será atualizada antes.</p>
      </LegalSection>

      <LegalSection title="7. Por quanto tempo guardamos">
        <ul>
          <li>
            Os dados da conta, dos planos, dos registros de treino e do feedback são mantidos
            enquanto a conta estiver ativa. Quando a conta é excluída, seus dados pessoais são
            excluídos ou anonimizados.
          </li>
          <li>
            Só a versão mais recente da anamnese é guardada. Quando o vínculo entre o treinador e
            o aluno termina, ela é mantida, mas o treinador deixa de vê-la; se ele voltar a treinar
            o aluno, ela volta a aparecer. Ela é excluída quando a conta do aluno ou a do
            treinador é excluída.
          </li>
          <li>Os registros de acesso dos servidores são mantidos por 30 dias.</li>
          <li>
            A Vertice não guarda as conversas com o assistente de treino: elas ficam apenas no
            navegador do treinador e se perdem ao sair do editor. Uma proposta do assistente só é
            salva quando o treinador a aplica, e passa a fazer parte do treino.
          </li>
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
          Para exercer esses direitos, escreva para o e-mail de contato (uma página de perfil para
          fazer esses pedidos no próprio aplicativo virá em breve). Se você é
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
