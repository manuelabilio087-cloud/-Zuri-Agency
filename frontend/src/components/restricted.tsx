import { Lock } from "lucide-react";

export function Restricted() {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 rounded-3xl p-6 text-center sm:p-10">
      <Lock size={28} className="text-[var(--accent)]" />
      <p className="font-medium">Acesso restrito a administradores</p>
    </div>
  );
}
