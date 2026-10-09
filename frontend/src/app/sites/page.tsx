"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Globe, ExternalLink, Download, PencilLine, Lock, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, WebsiteSummary } from "@/lib/api";
import { DashboardShell } from "@/components/dashboard-shell";
import { PageHeader } from "@/components/page-header";

export default function SitesPage() {
  const router = useRouter();
  const { user, accessToken, isLoading } = useAuth();
  const [sites, setSites] = useState<WebsiteSummary[] | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => setHost(window.location.host), []);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    api
      .listWebsites(accessToken)
      .then(setSites)
      .catch((err) => {
        if (err instanceof ApiError && err.upgradeRequired) setUpgradeRequired(true);
        setSites([]);
      });
  }, [accessToken]);

  async function handleDownload(site: WebsiteSummary) {
    if (!accessToken) return;
    setDownloading(site.id);
    try {
      await api.downloadWebsite(accessToken, site.id, site.slug);
    } finally {
      setDownloading(null);
    }
  }

  if (isLoading || !user) return null;

  return (
    <DashboardShell>
      <PageHeader
        title="Sites"
        description="Cria o site dos teus clientes a partir de um lead, publica-o num link ou descarrega o HTML."
        actions={
          !upgradeRequired && (
            <Link
              href="/leads"
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Users size={16} />
              Escolher um lead
            </Link>
          )
        }
      />

      {upgradeRequired ? (
        <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:p-10">
          <Lock size={28} className="text-[var(--accent)]" />
          <p className="font-medium">O criador de sites é exclusivo do plano Pro</p>
          <p className="max-w-sm text-sm text-[var(--text-muted)]">
            Gera o site completo de um cliente em segundos, edita os textos e publica-o com um link — ou descarrega o
            HTML.
          </p>
          <Link href="/plan" className="mt-2 rounded-full bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white">
            Ver planos
          </Link>
        </div>
      ) : sites === null ? (
        <p className="text-sm text-[var(--text-muted)]">A carregar…</p>
      ) : sites.length === 0 ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <Globe size={20} />
          </div>
          <p className="font-medium">Ainda não criaste nenhum site</p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-[var(--text-muted)]">
            <li>Abre um lead (de preferência um cliente que já fechaste).</li>
            <li>
              Carrega em <strong className="text-white">Criar site</strong> — a IA escreve os textos com os dados da
              empresa.
            </li>
            <li>Ajusta o que quiseres, publica e envia o link ao cliente.</li>
          </ol>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <div key={site.id} className="glass-panel flex flex-col rounded-3xl p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{site.businessName}</p>
                  <p className="truncate text-xs text-[var(--text-muted)]">
                    {host}/s/{site.slug}
                  </p>
                </div>
                <span
                  className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    site.published ? "bg-emerald-400/15 text-emerald-300" : "bg-white/5 text-[var(--text-muted)]"
                  }`}
                >
                  {site.published ? "Publicado" : "Rascunho"}
                </span>
              </div>
              <p className="mb-4 text-xs text-[var(--text-muted)]">
                Atualizado em {new Date(site.updatedAt).toLocaleDateString("pt-PT")}
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Link
                  href={`/sites/${site.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-2 text-sm font-medium text-white"
                >
                  <PencilLine size={14} /> Editar
                </Link>
                {site.published && (
                  <a
                    href={`/s/${site.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3.5 py-2 text-sm hover:bg-white/5"
                  >
                    <ExternalLink size={14} /> Ver
                  </a>
                )}
                <button
                  onClick={() => handleDownload(site)}
                  disabled={downloading === site.id}
                  className="flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3.5 py-2 text-sm hover:bg-white/5 disabled:opacity-50"
                >
                  <Download size={14} /> HTML
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
