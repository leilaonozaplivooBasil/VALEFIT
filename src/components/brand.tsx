// Identidade visual do ValeFit: logo (montanha + sol + onda) e o Cuca, nosso mascote.
import type { ReactNode } from "react";

export function LogoMark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <svg viewBox="4 2 82 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M7 30C16 29.5 22 22.5 30 18C35 15.2 40 16.2 45 12.2C48.4 9.4 50.2 4.6 52.6 5C55.2 5.4 58 14 63 20C67 24.6 75 26.2 82 21.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M34.5 27.2C42.5 23.4 52 24.6 60 28C66 30.6 74 32 81 28.6"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="72.4" cy="13.6" r="4.4" fill="currentColor" />
    </svg>
  );
}

export function Logo({ className = "", size = "md", wordmark = true }: { className?: string; size?: "sm" | "md" | "lg"; wordmark?: boolean }) {
  const mark = size === "lg" ? "h-10" : size === "sm" ? "h-6" : "h-8";
  const text = size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} aria-label="ValeFit">
      <LogoMark className={`${mark} w-auto`} />
      {wordmark && <span className={`${text} font-semibold tracking-[0.22em] leading-none`} style={{ fontFamily: "var(--font-wordmark)" }}>
        VALEFIT
      </span>}
    </span>
  );
}

export type CucaPose = "joia" | "piscando" | "rosto";

const CUCA_SRC: Record<CucaPose, { src: string; alt: string }> = {
  joia: { src: "/brand/cuca-joia.webp", alt: "Cuca, o jacaré mascote do ValeFit, fazendo joia e segurando uma garrafinha de água" },
  piscando: { src: "/brand/cuca-piscando.webp", alt: "Cuca, o jacaré mascote do ValeFit, piscando" },
  rosto: { src: "/brand/cuca-rosto.webp", alt: "Cuca, o mascote do ValeFit" },
};

export function Cuca({ pose = "joia", className = "", decorative = false }: { pose?: CucaPose; className?: string; decorative?: boolean }) {
  const { src, alt } = CUCA_SRC[pose];
  return <img src={src} alt={decorative ? "" : alt} className={`select-none ${className}`} draggable={false} />;
}

export function CucaAvatar({ className = "size-9" }: { className?: string }) {
  return (
    <span className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft ring-2 ring-card ${className}`}>
      <Cuca pose="rosto" decorative className="size-full scale-110 object-cover object-[50%_30%]" />
    </span>
  );
}

// Balão de fala do Cuca, no estilo de um mascote que conversa com a pessoa.
export function SpeechBubble({ title, children, side = "left", className = "" }: { title: ReactNode; children?: ReactNode; side?: "left" | "bottom"; className?: string }) {
  return (
    <div className={`relative rounded-2xl border border-border bg-card px-4 py-3 shadow-[0_8px_24px_-12px_rgba(2,51,38,0.25)] ${className}`}>
      <p className="text-sm font-extrabold text-foreground">{title}</p>
      {children ? <p className="mt-0.5 text-xs leading-snug text-muted">{children}</p> : null}
      <span
        aria-hidden="true"
        className={`absolute size-3 rotate-45 border-border bg-card ${
          side === "left" ? "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l" : "-bottom-1.5 left-8 border-b border-r"
        }`}
      />
    </div>
  );
}

// Ondas decorativas como as do painel (rodapé da barra lateral e cards).
export function Squiggle({ className = "w-10 text-primary" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 10" className={className} fill="none" aria-hidden="true">
      <path d="M2 4C10 1 16 7 24 4S38 1 46 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M2 8C10 5 16 11 24 8S38 5 46 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}
