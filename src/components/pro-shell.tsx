import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Users, Sparkles, MessageSquare, Wallet, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

const NAV = [
  { to: "/profissional/painel", label: "Pacientes", icon: Users },
  { to: "/profissional/mensagens", label: "Mensagens", icon: MessageSquare },
  { to: "/profissional/configuracoes-ia", label: "IA", icon: Sparkles },
  { to: "/profissional/financeiro", label: "Financeiro", icon: Wallet },
] as const;

export function ProShell({
  title,
  subtitle,
  children,
  action,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary">
              <div className="size-2.5 rounded-full bg-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight">Nutri IA Pro</span>
          </div>
          <button
            onClick={sair}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-muted hover:text-foreground"
          >
            <LogOut className="size-4" /> Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {action}
        </div>
        <div className="mt-6">{children}</div>
      </main>

      <nav className="fixed bottom-4 left-1/2 z-50 w-[min(30rem,calc(100%-1.5rem))] -translate-x-1/2">
        <div className="flex items-center justify-around rounded-2xl border border-border bg-card/90 px-2 py-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-4" strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
