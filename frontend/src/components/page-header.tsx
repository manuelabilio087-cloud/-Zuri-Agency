import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

// Cabeçalho comum a todas as páginas: título + descrição à esquerda e ações à
// direita no PC; no telemóvel as ações descem para baixo do título.
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold sm:text-[28px] sm:leading-tight">{title}</h1>
        {description && <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </div>
      {actions && <div className="flex flex-shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
