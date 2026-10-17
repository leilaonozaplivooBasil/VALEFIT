import { Link } from "@tanstack/react-router";
import { Utensils, Droplet, Dumbbell, Moon, AlertTriangle, Trophy, Sparkles } from "lucide-react";
import type { TimelineEvent, Nudge } from "@/lib/insights";

const ICONS = {
  meal: Utensils,
  water: Droplet,
  workout: Dumbbell,
  sleep: Moon,
  alert: AlertTriangle,
  win: Trophy,
} as const;

const TONES: Record<TimelineEvent["kind"], string> = {
  meal: "bg-primary-soft text-primary",
  water: "bg-water-soft text-water",
  workout: "bg-fat-soft text-fat",
  sleep: "bg-secondary text-muted",
  alert: "bg-fat-soft text-fat",
  win: "bg-primary text-primary-foreground",
};

export function DayTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
        <p className="text-sm font-semibold">Seu dia ainda está em branco</p>
        <p className="mt-1 text-xs text-muted">Cada registro aparece aqui em ordem — a IA acompanha você o dia inteiro.</p>
      </div>
    );
  }
  return (
    <ol className="space-y-1">
      {events.map((e, i) => {
        const Icon = ICONS[e.kind];
        return (
          <li key={`${e.at}-${i}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`grid size-8 place-items-center rounded-xl ${TONES[e.kind]}`}>
                <Icon className="size-3.5" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{e.time}</span>
                <span className="text-sm font-semibold">{e.title}</span>
              </div>
              {e.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{e.detail}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function NudgeStack({ nudges }: { nudges: Nudge[] }) {
  if (!nudges.length) return null;
  return (
    <div className="space-y-3">
      {nudges.map((n) => (
        <div
          key={n.id}
          className={`rounded-2xl border p-4 ${
            n.tone === "win"
              ? "border-primary/30 bg-primary-soft"
              : n.tone === "warn"
                ? "border-fat/30 bg-fat-soft"
                : "border-border bg-card"
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles className={`mt-0.5 size-4 shrink-0 ${n.tone === "warn" ? "text-fat" : "text-primary"}`} />
            <div className="flex-1">
              <p className="text-sm font-bold leading-snug">{n.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">{n.body}</p>
              {n.cta && (
                <Link
                  to={n.cta.to}
                  className="mt-3 inline-flex rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                >
                  {n.cta.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
