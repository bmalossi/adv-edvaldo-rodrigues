import { site } from "@/config/site";

const TermosDeUso = () => {
    return (
        <div className="container py-16 md:py-24">
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-8 font-serif text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                    Termos de Uso
                </h1>

                <div className="prose prose-slate max-w-none dark:prose-invert">
                    <p>
                        Bem-vindo ao site de <strong>{site.brand.fullName}</strong>. Ao acessar ou utilizar este site, você concorda com os seguintes termos e condições.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">1. Natureza das Informações</h2>
                    <p>
                        O conteúdo deste site é fornecido apenas para fins informativos e não constitui aconselhamento jurídico, publicidade de serviços para captação de clientes ou oferta de serviços. A transmissão de informações através deste site não cria uma relação advogado-cliente.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">2. Uso do Site</h2>
                    <p>
                        Você concorda em usar este site de forma ética e legal, não utilizando o formulário de contato para o envio de spam, conteúdos ofensivos ou informações protegidas por sigilo de terceiros sem autorização.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">3. Propriedade Intelectual</h2>
                    <p>
                        Todo o conteúdo deste site (textos, imagens, logotipos) é de propriedade exclusiva do escritório ou de seus licenciadores e está protegido por leis de direitos autorais. A reprodução sem autorização prévia é proibida.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">4. Limitação de Responsabilidade</h2>
                    <p>
                        O escritório não se responsabiliza por quaisquer danos decorrentes do uso ou da impossibilidade de uso deste site, ou de decisões tomadas por usuários com base nas informações aqui contidas sem a devida consultoria jurídica profissional.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">5. Sigilo Profissional</h2>
                    <p>
                        Embora empreguemos medidas de segurança, o envio de informações pela internet não é totalmente seguro. Recomendamos que dados extremamente sensíveis não sejam compartilhados via formulário de contato antes do estabelecimento formal de uma relação profissional.
                    </p>

                    <h2 className="mt-8 mb-4 text-2xl font-semibold">6. Alterações</h2>
                    <p>
                        Reservamo-nos o direito de modificar estes termos a qualquer momento, sem aviso prévio. O uso continuado do site após alterações constitui aceitação dos novos termos.
                    </p>

                    <p className="mt-12 text-sm text-muted-foreground italic">
                        Última atualização: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TermosDeUso;
