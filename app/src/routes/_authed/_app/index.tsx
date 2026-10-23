import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AgentCard } from "@/components/agents/agent-card";
import { Composer, toAgentOptions } from "@/components/channels/composer";
import { SidebarToggleBar } from "@/components/layout/sidebar-toggle";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { defaultAgentProfile } from "@/lib/agents/default-agent";
import { agentListQueryOptions, isSharedWithYou } from "@/lib/agents/queries";
import {
  CoworkerRoutingRefusedError,
  routeMessage,
} from "@/lib/channels/route";
import { useStartChannel } from "@/lib/channels/start";
import { appConfig } from "@/lib/generated/application-config";

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
  const {
    data: agents,
    isPending: loading,
    isError: failed,
  } = useQuery(agentListQueryOptions());
  const explore = agents?.filter(isSharedWithYou);
  const { start, startChosen, pending } = useStartChannel();
  const [error, setError] = useState<string | null>(null);

  /** Default recipient when the composer draft has no mention. */
  const fallback = defaultAgentProfile(
    agents,
    agents?.find((agent) => agent.visibility === "public"),
  );

  return (
    <>
      <SidebarToggleBar />
      <div className="flex-1 flex flex-col items-center justify-center w-full p-4 mt-8">
        <div className="flex flex-col items-center">
          <h2 className="text-sm uppercase text-muted-foreground font-medium tracking-tight text-center">
            {appConfig.brand.productName}
          </h2>
          <h1 className="text-2xl font-bold tracking-tight mt-1.5 text-center">
            Start a conversation
          </h1>
        </div>
        <div className="mt-8 w-full flex flex-col items-center">
          <Composer
            agents={toAgentOptions(agents)}
            className="w-full max-w-2xl"
            disabled={!fallback}
            onSubmit={async (draft) => {
              // A channel is pinned to one coworker for the life of its thread, so the coworker is
              // chosen now, before it is created. An `@` is an explicit choice and is honoured as-is.
              // With no `@`, the message is routed to the coworker it is for; if that routing cannot
              // run, it falls back to the same default the composer used to always use.
              setError(null);
              try {
                if (draft.agentId) {
                  // Recorded and started as one sequence, shared with `/channel/new`: the person
                  // already decided, and the trail has to say so wherever they decided it.
                  await startChosen(draft.agentId, draft.text);
                  return;
                }
                let agentId: string | undefined;
                try {
                  agentId = (await routeMessage(draft.text)).agentId;
                } catch (caught) {
                  if (caught instanceof CoworkerRoutingRefusedError)
                    throw caught;
                  agentId = fallback?.id;
                }
                if (!agentId) return;
                await start(agentId, draft.text);
              } catch (caught) {
                setError(
                  caught instanceof Error
                    ? caught.message
                    : "Couldn't start the conversation. Try again.",
                );
                throw caught;
              }
            }}
            pending={pending}
          />
          {fallback ? (
            // Said out loud: a message that silently reaches somebody you did not choose is the
            // kind of surprise that costs trust the first time it happens.
            <p className="mt-2 w-full max-w-2xl text-xs text-muted-foreground text-center">
              OpenBot picks the right Bot. Type <code>@</code> to choose one.
            </p>
          ) : null}
          {error ? (
            <p
              className="mt-2 w-full max-w-2xl text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : failed && agents === undefined ? (
            // The composer above is `disabled={!fallback}`, and a failed query does not by
            // itself mean `fallback` is undefined: TanStack Query keeps its last good `data`
            // across a failed background refetch, and `!fallback` alone is also true of a query
            // that loaded successfully and genuinely returned zero agents — a case where nobody
            // failed to load anything. `agents === undefined` is the one condition that is only
            // true when the query has never once returned successfully, so this alert can only
            // ever claim a load failure while that is actually what happened.
            <p
              className="mt-2 w-full max-w-2xl text-sm text-destructive"
              role="alert"
            >
              Couldn't load your Bots, so there's no one to send this to. Reload
              the page.
            </p>
          ) : null}
        </div>
        {/*
         * A carousel rather than the wrapping grid `/agents` uses, and the difference is on purpose.
         * This is a one-row teaser under the composer: a grid that wrapped here would push the row
         * down the page every time somebody shared another Bot. `/agents` is the browse surface and
         * wraps.
         *
         * What it replaces was `flex flex-row` with no wrap over cards that have no `shrink-0`, so
         * the fifth public Bot squeezed all five — the same failure `/agents` had just been fixed
         * for, still sitting here.
         */}
        <div className="mt-10 w-full max-w-2xl">
          {/*
           * The heading is repeated in each arm rather than hoisted above this conditional:
           * `CarouselPrevious`/`CarouselNext` read the carousel's own context, so they must stay
           * inside `<Carousel>`, and the heading shares that row with them once populated. Each
           * arm also reserves the same ~180px of body beneath it — a skeleton here, the
           * carousel's 144×180 cards, or the empty/error state's own `h-[180px]` — so the section
           * holds its own height across all four states and the composer sitting above it on
           * this centred column does not move when the query settles or fails.
           */}
          {loading ? (
            <>
              <h2 className="font-bold text-lg">Explore Bots</h2>
              <Skeleton className="mt-4 h-[180px]" />
            </>
          ) : explore?.length ? (
            // Wins over `failed`: a failed background refetch does not clear TanStack Query's
            // cached `data`, so a stale carousel here beats an error card claiming there is
            // nothing to explore, which would be false while this list is still populated.
            <Carousel
              opts={{ align: "start" }}
              aria-labelledby="explore-agents-heading"
            >
              <div className="flex flex-row items-center justify-between gap-4">
                <h2 id="explore-agents-heading" className="font-bold text-lg">
                  Explore Bots
                </h2>
                {/*
                 * `static` undoes the primitive's own absolute placement, which parks these either
                 * side of the row and off the edge of a prose-width column. They belong on the
                 * heading's baseline, where the section's other decisions are.
                 */}
                <div className="flex items-center gap-2">
                  <CarouselPrevious className="static translate-x-0 translate-y-0" />
                  <CarouselNext className="static translate-x-0 translate-y-0" />
                </div>
              </div>
              {/* `-ml-4`/`pl-4` is the primitive's own gap convention; `basis-auto` keeps each
                  slide the card's own 144px instead of a full-width slide. */}
              <CarouselContent className="-ml-4 mt-4">
                {explore.map((agent) => (
                  <CarouselItem className="basis-auto pl-4" key={agent.id}>
                    <Link search={{ agent: agent.id }} to="/channel/new">
                      <AgentCard agent={agent} appearance="tile" />
                    </Link>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          ) : failed && agents === undefined ? (
            // `agents === undefined` narrows this to "the query has never once returned
            // successfully" — not merely "the last request errored". `?.length` alone can't
            // tell that apart from a slice that loaded and is genuinely empty: TanStack Query
            // never clears `data` on a failed background refetch, so once the query has
            // resolved even one response, `agents` stays defined and `explore`'s emptiness is a
            // fact about that response, not a symptom of the failure. Rendering the destructive
            // card there would say the opposite of what a populated composer beside it (still
            // working off that same, successfully loaded `agents`) proves.
            <>
              <h2 className="font-bold text-lg">Explore Bots</h2>
              <Empty className="mt-4 h-[180px] border border-dashed border-destructive">
                <EmptyHeader>
                  <EmptyTitle className="text-destructive">
                    Couldn't load the Bots shared with you.
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </>
          ) : (
            // Reached both when the query never failed and `explore` is genuinely empty, and
            // when it failed but `agents` is defined — a loaded, empty slice either way. Same
            // plain copy for both: an empty roster is a fact, not an error.
            <>
              <h2 className="font-bold text-lg">Explore Bots</h2>
              <Empty className="mt-4 h-[180px] border border-dashed">
                <EmptyHeader>
                  <EmptyTitle className="text-muted-foreground">
                    Nobody has shared a Bot with you yet.
                  </EmptyTitle>
                </EmptyHeader>
              </Empty>
            </>
          )}
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
