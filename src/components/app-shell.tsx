import { Link, useLocation } from "@tanstack/react-router";
import { Home, Plus, Sparkles, TrendingUp, Trophy, Utensils, User, FileText } from "lucide-react";
import type { ReactNode } from "react";
import { Logo, Squiggle } from "@/components/brand";

const SIDE_NAV = [
  { to: "/dashboard", label: "Início", icon: Home },
  { to: "/log", label: "Alimentação", icon: Utensils },
  { to: "/evolucao", label: "Evolução", icon: TrendingUp },
  { to: "/missoes", label: "Missões", icon: Trophy },
  { to: "/chat", label: "Coach IA", icon: Sparkles },
  { to: "/relatorio", label: "Relatório", icon: FileText },
] as const;

function Sidebar({ pathname }: { pathname: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden bg-brand-deep text-white lg:flex">
      <div className="px-7 pb-8 pt-8">
        <Link to="/dashboard" aria-label="ValeFit — início">
          <Logo />
        </Link>
      </div>
      <nav className="flex flex-col gap-1 px-4">
        {SIDE_NAV.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
                active ? "bg-white/15 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]" : "text-white/80 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              {item.label}
            </Link>
          );
        })}
        <div className="mx-3 my-4 h-px bg-white/10" />
        <Link
          to="/perfil"
          className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-[15px] font-semibold transition ${
            pathname === "/perfil" ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/5 hover:text-white"
          }`}
        >
          <User className="size-5" /> Meu perfil
        </Link>
      </nav>

      <div className="relative mt-auto">
        <svg viewBox="0 0 256 120" className="absolute -top-24 left-0 w-full text-white" fill="none" aria-hidden="true">
          <path d="M0 70C40 40 70 30 110 50S190 100 256 60V120H0Z" fill="currentColor" opacity="0.06" />
          <path d="M0 95C50 70 90 75 140 88S210 100 256 85V120H0Z" fill="currentColor" opacity="0.05" />
        </svg>
        <div className="relative px-8 pb-10">
          <p className="text-[15px] font-medium leading-relaxed tracking-wide text-white/90">
            Pequenos hábitos hoje,
            <br />
            grandes resultados amanhã.
          </p>
          <Squiggle className="mt-3 w-12 text-brand-leaf" />
        </div>
      </div>
    </aside>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const nav = [
    { to: "/dashboard", label: "Início", icon: Home },
    { to: "/evolucao", label: "Evolução", icon: TrendingUp },
    { to: "/log", label: "", icon: Plus, primary: true },
    { to: "/missoes", label: "Missões", icon: Trophy },
    { to: "/chat", label: "Coach IA", icon: Sparkles },
  ] as const;

  return (
    <div className="relative min-h-screen bg-background pb-28 lg:pb-10 lg:pl-64">
      <Sidebar pathname={pathname} />
      {children}
      <nav className="fixed bottom-4 left-1/2 z-50 w-[min(25rem,calc(100%-1.5rem))] -translate-x-1/2 lg:hidden">
        <div className="flex items-center justify-around rounded-full border border-border bg-card/95 px-3 py-2 shadow-[0_20px_50px_-20px_rgba(2,51,38,0.35)] backdrop-blur-xl">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            if ("primary" in item && item.primary) {
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className="btn-3d -mt-7 grid size-14 place-items-center rounded-full bg-primary text-white ring-4 ring-background"
                  aria-label="Registrar refeição"
                >
                  <Icon className="size-6" strokeWidth={2.75} />
                </Link>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`relative flex flex-col items-center gap-0.5 px-2.5 py-1.5 text-[11px] font-bold transition ${
                  active ? "text-primary" : "text-muted hover:text-foreground"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
                <span>{item.label}</span>
                {active && <span className="absolute -bottom-1 h-[3px] w-8 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function TopBar({ title, right, wide = false }: { title?: string; right?: ReactNode; wide?: boolean }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className={`mx-auto flex h-16 items-center justify-between px-6 ${wide ? "max-w-6xl" : "max-w-xl"}`}>
        <div className="flex items-center gap-3">
          <Link to="/dashboard" aria-label="ValeFit — início" className="text-primary lg:hidden">
            <Logo size="sm" wordmark={!title} />
          </Link>
          {title ? <span className="text-xl font-extrabold tracking-tight">{title}</span> : null}
        </div>
        {right}
      </div>
    </header>
  );
}
