import { Link, useLocation } from "@tanstack/react-router";
import { Home, Plus, MessageCircle, TrendingUp, Trophy } from "lucide-react";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const nav = [
    { to: "/dashboard", label: "Hoje", icon: Home },
    { to: "/evolucao", label: "Evolução", icon: TrendingUp },
    { to: "/log", label: "", icon: Plus, primary: true },
    { to: "/missoes", label: "Missões", icon: Trophy },
    { to: "/chat", label: "Coach IA", icon: MessageCircle },
  ] as const;

  return (
    <div className="relative min-h-screen bg-background pb-28">
      {children}
      <nav className="fixed bottom-4 left-1/2 z-50 w-[min(24rem,calc(100%-1.5rem))] -translate-x-1/2">
        <div className="flex items-center justify-around rounded-2xl border border-border bg-card/90 px-2 py-2 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.25)] backdrop-blur-xl">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            if ("primary" in item && item.primary) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="grid size-12 place-items-center rounded-xl bg-foreground text-background shadow-lg transition hover:scale-105"
                  aria-label="Registrar refeição"
                >
                  {Icon ? <Icon className="size-5" strokeWidth={2.5} /> : null}
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-[10px] font-semibold uppercase tracking-wider transition ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {Icon ? <Icon className="size-4" strokeWidth={active ? 2.5 : 2} /> : (
                  <span className={`grid size-4 place-items-center rounded-full text-[9px] ${active ? "bg-foreground text-background" : "bg-secondary"}`}>P</span>
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function TopBar({ title, right }: { title?: string; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary">
            <div className="size-2.5 rounded-full bg-white" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">
            {title ?? "Nutri IA"}
          </span>
        </div>
        {right}
      </div>
    </header>
  );
}
