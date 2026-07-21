import Link from "next/link";
import { Search, Gauge, Sparkles, Users2, Check, X, Flame } from "lucide-react";
import { Logo } from "@/components/logo";

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Pesquisa empresas",
    description: "Indica a categoria e a cidade. O Zuri Agency encontra dezenas de empresas locais em segundos, via Google Places.",
  },
  {
    number: "02",
    icon: Gauge,
    title: "Análise automática",
    description: "Cada empresa recebe um Sales Score e uma Temperatura de Lead, calculados a partir do website, SEO, avaliações e presença digital.",
  },
  {
    number: "03",
    icon: Flame,
    title: "Prioriza os melhores",
    description: "O CRM organiza tudo por status, e a Priorização Diária (Pro) diz-te exatamente quem contactar hoje.",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "Aborda com IA",
    description: "Gera scripts de chamada, emails, mensagens de WhatsApp e propostas comerciais personalizadas para cada lead, num clique.",
  },
];

const WITHOUT = [
  "Horas a pesquisar empresas manualmente no Google Maps",
  "Sem forma de saber quais empresas têm mais potencial",
  "Mensagens genéricas, iguais para toda a gente",
  "Sem organização — leads perdidos em notas soltas",
];

const WITH = [
  "Dezenas de empresas encontradas em segundos",
  "Sales Score prioriza automaticamente as melhores oportunidades",
  "Abordagem personalizada gerada por IA para cada empresa",
  "CRM completo: status, notas e follow-ups num só sítio",
];

const AUDIENCE = [
  {
    title: "Freelancers digitais",
    description: "Vendes websites, gestão de redes sociais ou marketing digital? Encontra quem realmente precisa do teu serviço.",
  },
  {
    title: "Agências pequenas",
    description: "Preenche o teu pipeline sem gastar horas em prospeção manual — foca-te em fechar negócio.",
  },
  {
    title: "Consultores comerciais",
    description: "Gera abordagens personalizadas e com dados reais, em vez de mensagens genéricas de spam.",
  },
];

export default function HomePage() {
  return (
    <main className="bg-ambient min-h-screen text-[var(--text-primary)]">
      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Logo size="lg" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[var(--text-muted)] hover:text-white">
            Entrar
          </Link>
          <Link
            href="/register"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Criar conta
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-12 text-center">
        <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
          Encontra as empresas certas.
          <br />
          Aborda-as com <span className="text-[var(--accent)]">inteligência artificial</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-[var(--text-muted)]">
          O Zuri Agency pesquisa empresas locais, avalia a maturidade digital de cada uma automaticamente, e gera
          scripts, emails e propostas comerciais personalizadas — tudo numa plataforma.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/register"
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Criar conta grátis
          </Link>
          <a href="#como-funciona" className="glass-panel rounded-full px-6 py-3 text-sm font-medium hover:bg-white/5">
            Ver como funciona
          </a>
        </div>

        {/* Mockup teaser do dashboard */}
        <div className="glass-panel mx-auto mt-14 max-w-3xl rounded-3xl p-6 text-left">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-[var(--text-muted)]">Temperatura dos Leads</p>
            <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
              Exemplo
            </span>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Frio", value: 4, color: "var(--temp-frio)" },
              { label: "Morno", value: 9, color: "var(--temp-morno)" },
              { label: "Quente", value: 14, color: "var(--temp-quente)" },
              { label: "Muito Quente", value: 7, color: "var(--temp-muito-quente)" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--panel-border)] bg-white/5 p-4">
                <span className="mb-2 block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                <p className="font-display text-xl font-bold tabular-nums">{item.value}</p>
                <p className="text-xs text-[var(--text-muted)]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">Como funciona</h2>
        <p className="mx-auto mt-2 max-w-lg text-center text-sm text-[var(--text-muted)]">
          Do primeiro contacto ao lead fechado, em quatro passos.
        </p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.number} className="glass-panel rounded-3xl p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Icon size={18} />
                </div>
                <p className="font-display text-xs font-semibold text-[var(--accent)]">{step.number}</p>
                <p className="mt-1 font-medium">{step.title}</p>
                <p className="mt-2 text-sm text-[var(--text-muted)]">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparação */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">Sem vs. com Zuri Agency</h2>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-[var(--panel-border)] bg-white/[0.02] p-6">
            <p className="mb-4 font-medium text-[var(--text-muted)]">Prospeção tradicional</p>
            <ul className="space-y-3">
              {WITHOUT.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                  <X size={15} className="mt-0.5 flex-shrink-0 text-[var(--temp-muito-quente)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="glass-panel rounded-3xl border-[var(--accent)]/40 p-6">
            <p className="mb-4 font-medium text-[var(--accent)]">Com Zuri Agency</p>
            <ul className="space-y-3">
              {WITH.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Check size={15} className="mt-0.5 flex-shrink-0 text-[var(--accent)]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Para quem é */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-center text-2xl font-bold sm:text-3xl">Feito para quem vende serviços digitais</h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {AUDIENCE.map((item) => (
            <div key={item.title} className="glass-panel rounded-3xl p-6">
              <Users2 size={18} className="mb-3 text-[var(--accent)]" />
              <p className="font-medium">{item.title}</p>
              <p className="mt-2 text-sm text-[var(--text-muted)]">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-4 text-center">
        <div className="glass-panel rounded-3xl p-10">
          <h2 className="font-display text-2xl font-bold">Pronto para encontrar os teus próximos clientes?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
            Cria uma conta grátis e faz a tua primeira pesquisa em menos de 2 minutos.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-[var(--text-muted)]">
        © {new Date().getFullYear()} Zuri Agency. Todos os direitos reservados.
      </footer>
    </main>
  );
}
