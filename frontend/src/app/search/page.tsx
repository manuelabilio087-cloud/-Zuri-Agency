"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, Loader2, Star, Globe, Phone, Check } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Company, ApiError } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
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
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Pesquisar Empresas</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Encontra empresas locais e vê a maturidade digital de cada uma, calculada automaticamente.
        </p>
      </div>

      <form onSubmit={handleSearch} className="glass-panel mb-6 flex flex-wrap items-end gap-3 rounded-3xl p-5">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Categoria</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex: restaurantes, salões de beleza, clínicas"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </div>
        <div className="min-w-[160px] flex-1">
          <label className="mb-1.5 block text-xs text-[var(--text-muted)]">Cidade</label>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ex: Maputo"
            className="w-full rounded-xl border border-[var(--panel-border)] bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none"
            required
          />
        </div>
        <button
          type="submit"
          disabled={searching}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {searching ? <Loader2 size={16} className="animate-spin" /> : <SearchIcon size={16} />}
          Pesquisar
        </button>
      </form>

      {error && (
        <div className="glass-panel mb-6 rounded-2xl border-[var(--temp-muito-quente)]/30 p-4 text-sm text-[var(--temp-muito-quente)]">
          {error}
        </div>
      )}

      {companies !== null && (
        <div className="grid grid-cols-2 gap-4">
          {companies.length === 0 ? (
            <p className="col-span-2 py-8 text-center text-sm text-[var(--text-muted)]">
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
    <div className="glass-panel rounded-2xl p-5">
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
          <p className="flex items-center gap-1.5">
            <Phone size={12} /> {company.phone}
          </p>
        )}
        {company.website ? (
          <p className="flex items-center gap-1.5 truncate">
            <Globe size={12} /> {company.website}
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
            <p className="text-[var(--text-muted)]">Sales Score</p>
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
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--panel-border)] py-2 text-sm font-medium transition-colors hover:bg-white/5 disabled:cursor-default disabled:border-transparent disabled:bg-[var(--accent-soft)] disabled:text-[var(--accent)]"
      >
        {saved ? (
          <>
            <Check size={14} /> Guardado como Lead
          </>
        ) : (
          "Guardar como Lead"
        )}
      </button>
    </div>
  );
}
