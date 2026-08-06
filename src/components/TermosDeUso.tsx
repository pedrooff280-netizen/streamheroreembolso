import React, { useState, useEffect } from 'react';

const sections = [
  "Aceitação dos Termos",
  "Descrição do Serviço",
  "Cadastro e Conta do Usuário",
  "Planos e Pagamento",
  "Liberação do Acesso",
  "Política de Reembolso",
  "Uso Aceitável",
  "Créditos e Recursos Digitais",
  "Propriedade Intelectual",
  "Limitação de Responsabilidade",
  "Disponibilidade do Serviço",
  "Privacidade e Proteção de Dados",
  "Alterações nos Termos",
  "Legislação Aplicável e Foro",
  "Contato"
];

export function TermosDeUso() {
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const sectionElements = sections.map((_, idx) => document.getElementById(`section-${idx + 1}`));
      const scrollPosition = window.scrollY + 200; // Offset for header

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const section = sectionElements[i];
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="max-w-[1200px] mx-auto pt-8 flex flex-col lg:flex-row gap-12 items-start relative px-4 lg:px-0">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 sticky top-32 hidden lg:block">
        <h3 className="text-[10px] font-bold tracking-widest text-[#B0A8AE] uppercase mb-6">Nesta Página</h3>
        <nav className="flex flex-col mb-8 relative">
          {/* Active indicator line */}
          <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2A2328]" />
          <div 
            className="absolute left-0 w-[2px] bg-[#E74C6A] transition-all duration-300 ease-in-out" 
            style={{ 
              top: `${activeSection * 36}px`, 
              height: '36px'
            }} 
          />
          
          {sections.map((section, idx) => (
            <a 
              key={idx} 
              href={`#section-${idx + 1}`}
              onClick={() => setActiveSection(idx)}
              className={`pl-5 py-2 text-sm transition-colors h-[36px] flex items-center z-10 ${activeSection === idx ? 'text-white font-medium' : 'text-[#B0A8AE] hover:text-white'}`}
            >
              {idx + 1}. {section}
            </a>
          ))}
        </nav>

        <div className="bg-[#121015] border border-[#2A2328] rounded-xl p-6">
          <h4 className="text-[#B0A8AE] text-sm font-medium mb-6">Dúvidas sobre os nossos termos?</h4>
          <button className="text-[#E74C6A] text-sm font-semibold hover:text-[#f05c79] transition-colors">
            Fale com o suporte
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pb-20">
        <div className="mb-16">
          <h1 className="text-4xl font-bold text-white mb-6">Termos de Uso</h1>
          <p className="text-lg text-[#B0A8AE] leading-relaxed">
            Ao acessar, navegar ou utilizar a Hero de qualquer forma, você declara que leu,
            compreendeu e concorda integralmente com estes Termos de Uso.
          </p>
        </div>

        <div className="space-y-12">
          {/* Section 1 */}
          <section id="section-1" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">1. Aceitação dos Termos</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Ao acessar, navegar ou utilizar a Hero de qualquer forma, você declara que leu, compreendeu e concorda integralmente com estes Termos de Uso. Caso não concorde com qualquer disposição aqui descrita, solicitamos que não utilize a plataforma. O uso continuado do serviço após eventuais atualizações destes Termos constitui aceitação tácita das alterações realizadas.</p>
            </div>
          </section>

          {/* Section 2 */}
          <section id="section-2" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">2. Descrição do Serviço</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A Hero é uma plataforma digital que oferece acesso imediato a ferramentas, conteúdos e recursos online voltados para afiliados e criadores de conteúdo do TikTok Shop.</p>
              <p>A plataforma inclui, entre outras funcionalidades:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>análise e descoberta de produtos e vídeos em alta;</li>
                <li>geração de avatares com inteligência artificial;</li>
                <li>geração de prompts otimizados;</li>
                <li>galeria de prompts;</li>
                <li>treinamento completo (Creator Academy).</li>
              </ul>
              <p>A disponibilidade, escopo e funcionalidades dos serviços podem ser atualizados, expandidos ou modificados a critério exclusivo da Hero, sem necessidade de aviso prévio.</p>
            </div>
          </section>
          
          {/* Section 3 */}
          <section id="section-3" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">3. Cadastro e Conta do Usuário</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Para acessar a plataforma, o usuário deverá criar uma conta fornecendo informações verdadeiras, completas e atualizadas.</p>
              <p>O usuário é o único responsável por manter a confidencialidade de suas credenciais de acesso (e-mail e senha), bem como por todas as atividades realizadas em sua conta.</p>
              <p>Caso identifique qualquer uso não autorizado ou suspeita de violação de segurança, o usuário deverá notificar a Hero imediatamente.</p>
              <p>A plataforma reserva-se o direito de suspender ou encerrar contas que apresentem atividades suspeitas, fraudulentas ou que violem estes Termos.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section id="section-4" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">4. Planos e Pagamento</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A Hero oferece diferentes modalidades de acesso, incluindo planos de assinatura mensal, acesso anual e acesso vitalício.</p>
              <p>Os valores, condições e benefícios de cada plano estão descritos na página de preços da plataforma e podem ser atualizados periodicamente.</p>
              <p>Ao efetuar a compra, o usuário concorda com o valor e as condições apresentadas no momento da transação.</p>
              <p>Os pagamentos são processados por plataformas de pagamento terceirizadas (gateways de pagamento), e a Hero não armazena dados de cartão de crédito ou informações financeiras sensíveis.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section id="section-5" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">5. Liberação do Acesso</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Ao concluir a compra, o usuário reconhece que:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>O acesso à plataforma é liberado imediatamente após a confirmação do pagamento;</li>
                <li>A conta do usuário passa a ter acesso integral às funcionalidades da plataforma correspondentes ao plano adquirido;</li>
                <li>A disponibilização do acesso envolve custos operacionais, infraestrutura tecnológica e liberação de licenças digitais.</li>
              </ul>
              <p>A liberação do acesso caracteriza a entrega do serviço digital contratado.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section id="section-6" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">6. Política de Reembolso</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.1. Direito de Arrependimento</h3>
                <p>Conforme previsto no Código de Defesa do Consumidor (Brasil), o cliente pode solicitar cancelamento em até <strong className="text-white">7 (sete) dias corridos</strong> após a compra, desde que o pedido seja realizado dentro do prazo legal.</p>
                <p className="mt-2">Além disso, oferecemos <strong className="text-white">14 (quatorze) dias de garantia</strong> para casos em que o usuário tenha realizado a assinatura, mas <strong className="text-white">NÃO tenha acessado</strong> em nenhum momento a plataforma durante esse período.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.2. Condições para Análise de Reembolso</h3>
                <p>Solicitações de reembolso poderão ser analisadas considerando:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>Data e horário da compra;</li>
                  <li>Data e horário da solicitação;</li>
                  <li>Liberação e utilização da conta na plataforma;</li>
                  <li>Acesso às funcionalidades e recursos do sistema;</li>
                  <li>Quantidade de ferramentas utilizadas e recursos consumidos.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.3. Custos Operacionais e Uso da Plataforma</h3>
                <p>A Hero é uma plataforma que opera com custos reais para cada interação do usuário.</p>
                <p className="mt-2">Cada utilização das ferramentas — como geração de imagens com IA, criação de roteiros, processamento de vídeos e consumo de créditos — gera despesas diretas com infraestrutura tecnológica, processamento computacional, licenças de APIs de inteligência artificial e armazenamento em nuvem.</p>
                <p className="mt-2">Esses custos são irreversíveis e não podem ser recuperados pela empresa.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.4. Reembolso Integral</h3>
                <p>O reembolso integral da compra somente será concedido quando o usuário não tiver utilizado a plataforma de forma significativa após a liberação do acesso.</p>
                <p className="mt-2">A partir do momento em que o usuário acessa e utiliza as ferramentas disponibilizadas, os custos operacionais gerados pela empresa tornam o reembolso integral inviável.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.5. Reembolso Parcial</h3>
                <p>Nos casos em que o usuário já tenha utilizado a plataforma, poderá ser concedido um reembolso parcial, cujo valor será calculado proporcionalmente ao uso realizado.</p>
                <p className="mt-2">A análise levará em conta a quantidade de ferramentas acessadas, recursos consumidos (como créditos de IA, gerações de imagem e roteiros), tempo de uso ativo na plataforma e os custos operacionais já incorridos pela empresa.</p>
                <p className="mt-2">Quanto maior a utilização da plataforma, menor será o valor passível de reembolso.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.6. Recusa de Reembolso</h3>
                <p>A solicitação de reembolso poderá ser integralmente recusada quando for identificado uso extensivo da plataforma, incluindo, mas não se limitando a:</p>
                <ul className="list-disc list-inside space-y-1 ml-4 mt-2">
                  <li>múltiplas gerações de conteúdo com IA;</li>
                  <li>consumo significativo de créditos;</li>
                  <li>acesso recorrente às ferramentas e funcionalidades;</li>
                  <li>qualquer outro uso que demonstre aproveitamento substancial do serviço contratado.</li>
                </ul>
                <p className="mt-2">A recusa será fundamentada na comprovação de que o serviço digital foi efetivamente entregue e utilizado.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.7. Prazo de Análise</h3>
                <p>As solicitações de reembolso passam por uma análise detalhada que pode levar de <strong className="text-white">7 (sete) dias úteis</strong> a até <strong className="text-white">3 (três) meses</strong>, dependendo da complexidade do caso.</p>
                <p className="mt-2">Esse prazo permite avaliar a legitimidade do pedido e o histórico completo de utilização da plataforma pelo usuário.</p>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white mb-2">6.8. Suporte ao Usuário</h3>
                <p>A Hero mantém equipe de suporte disponível para auxiliar os usuários na utilização da plataforma e na resolução de dúvidas técnicas.</p>
                <p className="mt-2">Recomendamos que, antes de solicitar reembolso, o usuário entre em contato com nosso suporte para que possamos ajudá-lo a resolver qualquer dificuldade.</p>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section id="section-7" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">7. Uso Aceitável</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>O usuário compromete-se a utilizar a Hero exclusivamente para fins lícitos e em conformidade com estes Termos.</p>
              <p>É expressamente proibido:</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>utilizar a plataforma para qualquer finalidade ilegal, fraudulenta ou não autorizada;</li>
                <li>compartilhar, revender ou redistribuir o acesso à plataforma ou seus conteúdos a terceiros;</li>
                <li>tentar burlar, desabilitar ou interferir nos mecanismos de segurança da plataforma;</li>
                <li>realizar engenharia reversa, descompilar ou extrair código-fonte da plataforma;</li>
                <li>utilizar bots, scrapers ou qualquer ferramenta automatizada para acessar ou coletar dados da plataforma;</li>
                <li>difamar, assediar ou prejudicar outros usuários da plataforma.</li>
              </ul>
              <p>O descumprimento dessas regras poderá resultar na suspensão ou encerramento imediato da conta, sem direito a reembolso.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section id="section-8" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">8. Créditos e Recursos Digitais</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A plataforma utiliza um sistema de créditos para acesso a determinadas funcionalidades avançadas, como geração de imagens e conteúdos com inteligência artificial.</p>
              <p>Os créditos adquiridos são de uso pessoal e intransferível, não possuem valor monetário fora da plataforma e não são reembolsáveis após a utilização.</p>
              <p>O saldo de créditos e as condições de uso podem ser consultados diretamente na plataforma.</p>
            </div>
          </section>

          {/* Section 9 */}
          <section id="section-9" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">9. Propriedade Intelectual</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Todo o conteúdo, design, código-fonte, funcionalidades, textos, gráficos, logos, ícones, imagens, clipes de áudio, compilações de dados, software e demais materiais disponibilizados na plataforma são propriedade exclusiva da Hero ou de seus licenciadores, protegidos pelas leis de direitos autorais e propriedade intelectual aplicáveis.</p>
              <p>Os conteúdos gerados pelo usuário através das ferramentas de IA da plataforma (como imagens, roteiros e criativos) podem ser utilizados pelo usuário para fins pessoais e comerciais, respeitando as limitações de uso das tecnologias de IA utilizadas.</p>
            </div>
          </section>

          {/* Section 10 */}
          <section id="section-10" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">10. Limitação de Responsabilidade</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A Hero fornece ferramentas e informações para auxiliar o usuário em suas atividades como afiliado e criador de conteúdo.</p>
              <p>No entanto, não garantimos resultados financeiros específicos, vendas ou qualquer forma de retorno financeiro.</p>
              <p>Os resultados dependem exclusivamente do esforço, dedicação e estratégia individual de cada usuário.</p>
              <p>Em nenhuma hipótese a Hero, seus diretores, funcionários, parceiros, fornecedores ou afiliados serão responsáveis por quaisquer danos diretos, indiretos, incidentais, especiais, consequenciais ou punitivos decorrentes do uso ou impossibilidade de uso da plataforma.</p>
            </div>
          </section>

          {/* Section 11 */}
          <section id="section-11" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">11. Disponibilidade do Serviço</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A Hero se esforça para manter a plataforma disponível <strong className="text-white">24 horas por dia, 7 dias por semana</strong>.</p>
              <p>No entanto, o serviço pode sofrer interrupções temporárias para manutenção, atualizações ou por circunstâncias fora do nosso controle (como falhas de infraestrutura de terceiros).</p>
              <p>A Hero não será responsabilizada por eventuais períodos de indisponibilidade.</p>
            </div>
          </section>

          {/* Section 12 */}
          <section id="section-12" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">12. Privacidade e Proteção de Dados</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A coleta, armazenamento e tratamento de dados pessoais dos usuários são regidos por nossa Política de Privacidade, que é parte integrante destes Termos de Uso.</p>
              <p>Ao utilizar a plataforma, o usuário declara que leu e concorda com as práticas descritas na Política de Privacidade.</p>
            </div>
          </section>

          {/* Section 13 */}
          <section id="section-13" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">13. Alterações nos Termos</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>A Hero reserva-se o direito de modificar, atualizar ou substituir estes Termos de Uso a qualquer momento, a seu exclusivo critério.</p>
              <p>As alterações entrarão em vigor imediatamente após a publicação na plataforma.</p>
              <p>Recomendamos que o usuário revise periodicamente estes Termos para estar ciente de eventuais mudanças.</p>
              <p>O uso continuado da plataforma após alterações constitui aceitação dos novos termos.</p>
            </div>
          </section>

          {/* Section 14 */}
          <section id="section-14" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">14. Legislação Aplicável e Foro</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Estes Termos de Uso são regidos e interpretados de acordo com as leis da República Federativa do Brasil.</p>
              <p>Para a resolução de quaisquer controvérsias decorrentes destes Termos, as partes elegem o foro da comarca do domicílio do usuário, conforme previsto no Código de Defesa do Consumidor.</p>
            </div>
          </section>

          {/* Section 15 */}
          <section id="section-15" className="scroll-mt-32">
            <h2 className="text-2xl font-bold text-white mb-4">15. Contato</h2>
            <div className="text-[#B0A8AE] leading-relaxed space-y-4">
              <p>Se você tiver dúvidas, sugestões ou necessitar de suporte relacionado a estes Termos de Uso, entre em contato conosco através do e-mail: <strong className="text-white">hero@seudominio.com</strong></p>
              <p>Nossa equipe terá prazer em ajudá-lo.</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-24 pt-8 border-t border-[#2A2328] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#B0A8AE]">© 2025 Hero. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <span className="text-sm text-[#B0A8AE] hover:text-white cursor-pointer transition-colors">Termos de Uso</span>
            <span className="text-sm text-[#B0A8AE] hover:text-white cursor-pointer transition-colors">Política de Privacidade</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
