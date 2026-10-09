"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, Loader2, Star, Globe, Phone, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Company, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";
import { TemperatureBadge } from "@/components/temperature-badge";

const POLL_INTERVAL_MS = 4000;
const MAX_POLL_ATTEMPTS = 15; // ~1 minuto

export default function SearchPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();

  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setSearching(true);
    setError(null);
    setCompanies(null);
    try {
      const result = await api.searchCompanies(accessToken, { category, city });
      setCompanies(result.companies);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erro ao pesquisar. Tenta novamente.");
    } finally {
      setSearching(false);
    }
  }

  async function handleSaveLead(companyId: string) {
    if (!accessToken) return;
    try {
      await api.saveLead(accessToken, companyId);
      setSavedIds((prev) => new Set(prev).add(companyId));
    } catch {
      // silencioso — o botão simplesmente não fica marcado como guardado
    }
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <PageHeader
        title="Pesquisar empresas"
        description="Encontra empresas locais e vê a maturidade digital de cada uma, calculada automaticamente."
      />

      <form
        onSubmit={handleSearch}
        className="glass-panel mb-6 grid gap-3 rounded-3xl p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5"
      >
        <div>
          <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Categoria</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: restaurantes, salões de beleza, clínicas"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-3 text-base text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:py-2.5 sm:text-sm"
            required
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Cidade</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Maputo"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-3 text-base text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none sm:py-2.5 sm:text-sm"
            required
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 sm:py-2.5"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <SearchIcon size={16} />}
          {searching ? "A pesquisar…" : "Pesquisar"}
        </button>
      </form>

      {error && <SearchError message={error} />}

      {companies !== null && (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {companies.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-[var(--text-muted)]">
              Nenhuma empresa encontrada para esta categoria/cidade.
            </p>
          ) : (
            companies.map((company) => (
              <CompanyResultCard
                key={company.id}
                company={company}
                saved={savedIds.has(company.id)}
                onSave={() => handleSaveLead(company.id)}
                accessToken={accessToken!}
              />
            ))
          )}
        </div>
      )}
    </DashboardShell>
  );
}

function CompanyResultCard({
  company: initialCompany,
  saved,
  onSave,
  accessToken,
}: {
  company: Company;
  saved: boolean;
  onSave: () => void;
  accessToken: string;
}) {
  const [company, setCompany] = useState(initialCompany);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (company.analysis) return;

    const interval = setInterval(async () => {
      attemptsRef.current += 1;
      try {
        const status = await api.getAnalysisStatus(accessToken, company.id);
        if (status.status === "done" && status.analysis) {
          setCompany((prev) => ({ ...prev, analysis: status.analysis }));
          clearInterval(interval);
        }
      } catch {
        // ignora falhas pontuais de polling
      }
      if (attemptsRef.current >= MAX_POLL_ATTEMPTS) clearInterval(interval);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [company.analysis, company.id, accessToken]);

  return (
    <div className="glass-panel flex flex-col rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{company.name}</h3>
          <p className="text-xs text-[var(--text-muted)]">{company.category}</p>
        </div>
        {company.analysis ? (
          <TemperatureBadge temperature={company.analysis.leadTemperature} />
        ) : (
          <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-white/5 px-2.5 py-1 text-xs text-[var(--text-muted)]">
            <Loader2 size={11} className="animate-spin" />
            A analisar
          </span>
        )}
      </div>

      <div className="mb-3 space-y-1 text-xs text-[var(--text-muted)]">
        {company.phone && (
          <a href={`tel:${company.phone.replace(/\s/g, "")}`} className="flex items-center gap-1.5 hover:text-white">
            <Phone size={12} /> {company.phone}
          </a>
        )}
        {company.website ? (
          <p className="flex min-w-0 items-center gap-1.5">
            <Globe size={12} className="flex-shrink-0" />
            <a href={company.website} target="_blank" rel="noopener noreferrer" className="truncate hover:text-white">
              {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </p>
        ) : (
          <p className="flex items-center gap-1.5 text-[var(--temp-muito-quente)]">
            <Globe size={12} /> Sem website
          </p>
        )}
        {company.rating !== null && (
          <p className="flex items-center gap-1.5">
            <Star size={12} /> {company.rating} ({company.reviewsCount ?? 0} avaliações)
          </p>
        )}
      </div>

      {company.analysis && (
        <div className="mb-3 flex items-center gap-4 rounded-xl bg-white/5 p-3 text-xs">
          <div>
            <p className="text-[var(--text-muted)]">Sales score</p>
            <p className="font-display text-lg font-bold tabular-nums">{company.analysis.salesScore}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[var(--text-muted)]">Recomendação</p>
            <p className="truncate font-medium">{company.analysis.recommendedService}</p>
          </div>
        </div>
      )}

      <button
        onClick={onSave}
        disabled={saved}
        className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] py-2.5 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-default disabled:border-transparent disabled:bg-[var(--accent-soft)] disabled:text-[var(--accent)]"
      >
        {saved ? (
          <>
            <Check size={14} /> Guardado nos leads
          </>
        ) : (
          "Guardar como lead"
        )}
      </button>
    </div>
  );
}

// Erros técnicos da Google (JSON em bruto) ficam escondidos atrás de "Detalhes técnicos".
function SearchError({ message }: { message: string }) {
  const isProviderError = message.startsWith("Google Places API");
  return (
    <div className="glass-panel mb-6 rounded-2xl border-[var(--temp-muito-quente)]/30 p-4 text-sm">
      <p className="text-[var(--temp-muito-quente)]">
        {isProviderError
          ? "A pesquisa de empresas está indisponível de momento. Tenta novamente daqui a pouco."
          : message}
      </p>
      {isProviderError && (
        <details className="mt-2 text-xs text-[var(--text-muted)]">
          <summary className="cursor-pointer select-none">Detalhes técnicos</summary>
          <p className="mt-2 break-words font-mono">{message}</p>
        </details>
      )}
    </div>
  );
}
