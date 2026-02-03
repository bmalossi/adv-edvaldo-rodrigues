import { site } from "@/config/site";

const PoliticaDePrivacidade = () => {
    return (
        <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-8 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                    Política de Privacidade
                </h1>

                <div className="prose prose-slate max-w-none dark:prose-invert">
                    <p>
                        Esta Política de Privacidade descreve como o escritório do <strong>{site.brand.fullName}</strong> ("nós", "nosso" ou "escritório") coleta, utiliza e protege as informações pessoais que você nos fornece através deste site.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">1. Informações que Coletamos</h2>
                    <p>
                        Coletamos informações que você nos fornece diretamente quando preenche nosso formulário de contato, incluindo:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Nome completo;</li>
                        <li>Endereço de e-mail;</li>
                        <li>Número de telefone;</li>
                        <li>Área de interesse jurídico;</li>
                        <li>Descrição resumida do caso.</li>
                    </ul>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">2. Como Utilizamos suas Informações</h2>
                    <p>
                        As informações coletadas são utilizadas exclusivamente para:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Responder às suas solicitações de contato e avaliações iniciais;</li>
                        <li>Prestar os serviços jurídicos solicitados;</li>
                        <li>Cumprir obrigações legais e regulatórias.</li>
                    </ul>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">3. Base Legal para o Processamento</h2>
                    <p>
                        Processamos seus dados pessoais com base em seu consentimento (ao preencher o formulário) e para a execução de medidas pré-contratuais ou contratuais, bem como para o exercício regular de direitos em processos judiciais, administrativos ou arbitrais, conforme a Lei Geral de Proteção de Dados (LGPD).
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">4. Proteção e Segurança</h2>
                    <p>
                        Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados pessoais contra acesso não autorizado, perda, alteração ou destruição. O sigilo profissional é uma prioridade e pilar fundamental de nossa atuação jurídica.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">5. Seus Direitos</h2>
                    <p>
                        Conforme a LGPD, você tem direito a:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                        <li>Confirmar a existência de tratamento de seus dados;</li>
                        <li>Acessar seus dados;</li>
                        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
                        <li>Revogar seu consentimento a qualquer momento.</li>
                    </ul>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">6. Contato</h2>
                    <p>
                        Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato através do e-mail: <strong>{site.contact.email}</strong>.
                    </p>

                    <p className="mt-12 text-sm text-muted-foreground italic">
                        Última atualização: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PoliticaDePrivacidade;
