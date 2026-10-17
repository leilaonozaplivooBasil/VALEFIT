// Renderizador markdown mínimo (títulos, listas, negrito) — sem dependências.

function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={`${keyBase}-${i}`}>{p.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyBase}-${i}`}>{p}</span>
    ),
  );
}

export function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];

  const flush = (k: string) => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${k}`} className="my-2 space-y-1.5 pl-1">
        {list.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed">
            <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
            <span>{inline(item, `li-${k}-${i}`)}</span>
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    if (!line) {
      flush(String(idx));
      return;
    }
    if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
      return;
    }
    flush(String(idx));
    if (line.startsWith("### ")) {
      out.push(<h4 key={idx} className="mt-4 text-sm font-bold">{line.slice(4)}</h4>);
    } else if (line.startsWith("## ")) {
      out.push(
        <h3 key={idx} className="mt-5 font-mono text-[10px] uppercase tracking-widest text-muted">
          {line.slice(3)}
        </h3>,
      );
    } else if (line.startsWith("# ")) {
      out.push(<h2 key={idx} className="mt-4 text-lg font-bold tracking-tight">{line.slice(2)}</h2>);
    } else {
      out.push(
        <p key={idx} className="mt-2 text-sm leading-relaxed">
          {inline(line, `p-${idx}`)}
        </p>,
      );
    }
  });
  flush("end");

  return <div>{out}</div>;
}
