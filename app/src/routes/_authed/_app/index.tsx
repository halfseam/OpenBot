import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import Avatar from 'boring-avatars';
import { useState } from 'react';
import { Composer, toAgentOptions } from '@/components/channels/composer';
import { agentListQueryOptions } from '@/lib/agents/queries';
import { routeMessage } from '@/lib/channels/route';
import { useStartChannel } from '@/lib/channels/start';
import { appConfig } from '@/lib/generated/application-config';

export const Route = createFileRoute('/_authed/_app/')({
  component: RouteComponent,
});

interface ProjectSection {
  id: string;
  title: string;
  badge: string;
  icon: string;
  description: string;
  agentOrder: string[];
}

const DEFAULT_PROMPTS: Record<string, string> = {
  'sentinel-scout': 'Executar varredura completa do Trio Scout Sentinel nas últimas 24h (GitHub Velocity, HuggingFace, Hacker News), filtrar fake stars/wrappers e entregar os furos técnicos com score de 100 pts.',
  'luxundone-esteira': 'Iniciar orquestração do lote quinzenal de 14 projetos JSON com distribuição A5/B5/C2/D1/E1 e travas invioláveis.',
  'luxundone-roteirista': 'Analisar o projeto ativo e gerar o roteiro com física de destruição e validação do MANIFEST.json.',
  'luxundone-studio': 'Gerar os prompts de vídeo V8 (10s) e as âncoras DALL-E no formato 9:16 com a Regra 13.',
  'luxundone-redator': 'Escrever a copy de 5 blocos para Instagram/Facebook (1.700 a 1.900 caracteres) e as tags SEO para YouTube Shorts.',
  'mercury-radar': 'Buscar produtos físicos de impulso (15 a 35 euros) no TikTok Shop ES e cruzar com catálogo validado.',
  'mercury-script': 'Gerar lote de 3 roteiros UGC de 15s no padrão Hook (3s) + Dor/Demonstração (7s) + CTA (5s).',
  'mercury-compliance': 'Auditar roteiros e copys contra a política de brand safety do TikTok Shop e folha 9-Grid.',
  'kronos-researcher': 'Pesquisar um mistério histórico com ganchos de alta retenção e fatos bizarros comprovados.',
  'kronos-storyteller': 'Escrever o roteiro narrativo com estrutura de suspense e open loops.',
  'kronos-prompter': 'Gerar sequência de prompts de imagem consistentes para as cenas da narrativa.',
  'general-assistant': 'Como posso ajudar com a infraestrutura, navegação ou tarefas do sistema hoje?',
  'knowledge': 'Consultar a base de especificações técnicas e operacionais.',
};

const PROJECT_SECTIONS: ProjectSection[] = [
  {
    id: 'sentinel',
    title: 'Operação Sentinel',
    badge: 'X & Tech Scout',
    icon: '🛡️',
    description: 'Radar de inteligência técnica, filtro anti-astroturfing e análise forense de código.',
    agentOrder: [
      'sentinel-scout',
    ],
  },
  {
    id: 'luxundone',
    title: 'Operação LuxUndone',
    badge: 'CrushCockpit Esteira',
    icon: '🚗',
    description: 'Esteira de produção quinzenal, físicas ASMR e redação de copys multicanais.',
    agentOrder: [
      'luxundone-esteira',
      'luxundone-roteirista',
      'luxundone-studio',
      'luxundone-redator',
    ],
  },
  {
    id: 'mercury',
    title: 'Operação Mercury',
    badge: 'TikTok Shop UGC',
    icon: '🛍️',
    description: 'Pesquisa de produtos, roteirização de alta retenção e compliance de brand safety.',
    agentOrder: [
      'mercury-radar',
      'mercury-script',
      'mercury-compliance',
    ],
  },
  {
    id: 'kronos',
    title: 'Operação Kronos',
    badge: 'Mistérios & História',
    icon: '📜',
    description: 'Dossiês de fatos bizarros, roteiros de suspense e engenharia de imagens consistentes.',
    agentOrder: [
      'kronos-researcher',
      'kronos-storyteller',
      'kronos-prompter',
    ],
  },
  {
    id: 'system',
    title: 'Sistema & Suporte',
    badge: 'Geral',
    icon: '⚡',
    description: 'Assistentes utilitários gerais e base de documentação técnica.',
    agentOrder: [
      'general-assistant',
      'knowledge',
    ],
  },
];

function RouteComponent() {
  const { data: agents } = useQuery(agentListQueryOptions());
  const coworkers = agents?.filter((a) => !a.mine && a.visibility === 'public');
  const { start, pending } = useStartChannel();
  const [error, setError] = useState<string | null>(null);

  const defaultAgent = coworkers?.[0] ?? agents?.[0];

  const handleSubmit = async (value: { text: string; agentId?: string }) => {
    setError(null);
    try {
      let agentId = value.agentId ?? undefined;
      if (agentId) {
        await routeMessage(value.text, agentId).catch(() => {});
      } else {
        try {
          const decision = await routeMessage(value.text);
          agentId = decision.agentId;
        } catch {
          agentId = defaultAgent?.id;
        }
      }
      if (!agentId) return;
      await start(agentId, value.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível iniciar a conversa.');
      throw e;
    }
  };

  const handleExecuteAgent = async (agentId: string) => {
    const prompt = DEFAULT_PROMPTS[agentId] || 'Executar tarefa padrão do agente';
    await handleSubmit({ text: prompt, agentId });
  };

  return (
    <div className='flex-1 flex flex-col items-center justify-start w-full p-4 py-8 overflow-y-auto'>
      <div className='flex flex-col items-center'>
        <h2 className='text-sm uppercase text-muted-foreground font-medium tracking-tight text-center'>
          {appConfig.brand.productName}
        </h2>
        <h1 className='text-2xl font-bold tracking-tight mt-1.5 text-center'>
          Iniciar um novo canal
        </h1>
      </div>

      <div className='mt-6 w-full flex flex-col items-center'>
        <Composer
          agents={toAgentOptions(agents)}
          className='w-full max-w-2xl'
          disabled={!defaultAgent}
          onSubmit={handleSubmit}
          pending={pending}
        />
        {defaultAgent && (
          <p className='mt-2 w-full max-w-2xl text-xs text-muted-foreground text-center'>
            Enviado para o agente correspondente. Digite <code>@</code> para escolher diretamente.
          </p>
        )}
        {error && (
          <p className='mt-2 w-full max-w-2xl text-sm text-destructive' role='alert'>
            {error}
          </p>
        )}
      </div>

      <div className='mt-10 w-full max-w-3xl px-2 flex flex-col gap-8 mb-12'>
        <div className='flex flex-col gap-1 border-b border-border/40 pb-3'>
          <h2 className='font-bold text-xl tracking-tight'>Explorar Agentes por Projeto & Steps</h2>
          <p className='text-sm text-muted-foreground'>
            Cada projeto é organizado em sequência lógica de produção (Step 1 → Step 2 → Step 3...).
          </p>
        </div>

        {PROJECT_SECTIONS.map((section) => {
          const sectionCoworkers = (
            coworkers?.filter((a) => section.agentOrder.includes(a.id)) ?? []
          ).sort((a, b) => section.agentOrder.indexOf(a.id) - section.agentOrder.indexOf(b.id));

          if (!sectionCoworkers.length) return null;

          return (
            <div key={section.id} className='flex flex-col gap-3'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-lg'>{section.icon}</span>
                  <h3 className='font-semibold text-base tracking-tight'>{section.title}</h3>
                  <span className='text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium'>
                    {section.badge}
                  </span>
                </div>
                <span className='text-xs text-muted-foreground font-mono'>
                  {sectionCoworkers.length} {sectionCoworkers.length === 1 ? 'step' : 'steps'}
                </span>
              </div>

              <div className='flex flex-col gap-2'>
                {sectionCoworkers.map((agent, index) => (
                  <button
                    key={agent.id}
                    onClick={() => handleExecuteAgent(agent.id)}
                    disabled={pending}
                    className='group flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-accent/50 hover:border-border transition-all duration-150 shadow-sm text-left w-full cursor-pointer disabled:opacity-50'
                  >
                    <div className='flex items-center gap-3.5 min-w-0 pr-4'>
                      <div className='shrink-0 size-9 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20'>
                        {index + 1}
                      </div>
                      <div className='shrink-0 size-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border/40'>
                        <Avatar
                          name={agent.avatarSeed ?? agent.name}
                          size={36}
                          variant='beam'
                          colors={['#0ea5e9', '#6366f1', '#ec4899', '#f43f5e', '#8b5cf6']}
                        />
                      </div>
                      <div className='flex flex-col min-w-0'>
                        <div className='flex items-center gap-2'>
                          <span className='font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate'>
                            {agent.name}
                          </span>
                          {agent.title && (
                            <span className='text-xs text-muted-foreground/80 font-normal truncate hidden sm:inline'>
                              · {agent.title}
                            </span>
                          )}
                        </div>
                        {agent.roleDescription && (
                          <p className='text-xs text-muted-foreground line-clamp-1 mt-0.5'>
                            {agent.roleDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='shrink-0 flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors pl-2'>
                      <span className='hidden sm:inline'>Executar</span>
                      <span className='text-sm transition-transform group-hover:translate-x-0.5'>→</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
