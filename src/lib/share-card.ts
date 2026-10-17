// Geração de cards de compartilhamento (Stories 1080x1920) via Canvas 2D.
// Estética Apple Fitness: fundo profundo, tipografia gigante, anel de progresso.

export interface CardData {
  kind: string;
  eyebrow: string;
  headline: string;
  unit?: string;
  caption: string;
  ring?: number; // 0–100
  stats: { label: string; value: string }[];
  accent: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderCard(data: CardData): HTMLCanvasElement {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#0a0a0a");
  g.addColorStop(1, "#111a15");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // brilho de fundo
  const glow = ctx.createRadialGradient(W * 0.75, H * 0.18, 40, W * 0.75, H * 0.18, 720);
  glow.addColorStop(0, `${data.accent}55`);
  glow.addColorStop(1, "#00000000");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "left";
  ctx.fillStyle = "#ffffff";
  ctx.font = "600 30px Inter, system-ui, sans-serif";
  ctx.globalAlpha = 0.55;
  ctx.fillText("NUTRI IA", 96, 150);
  ctx.globalAlpha = 1;

  ctx.fillStyle = data.accent;
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText(data.eyebrow.toUpperCase(), 96, 300);

  // anel
  if (typeof data.ring === "number") {
    const cx = W - 260;
    const cy = 300;
    const r = 96;
    ctx.lineWidth = 22;
    ctx.strokeStyle = "#ffffff22";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = data.accent;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * Math.min(100, data.ring)) / 100);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.font = "800 60px Inter, system-ui, sans-serif";
    ctx.fillText(String(data.ring), cx, cy + 22);
    ctx.textAlign = "left";
  }

  // headline gigante
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 210px Inter, system-ui, sans-serif";
  ctx.fillText(data.headline, 90, 620);
  if (data.unit) {
    const w = ctx.measureText(data.headline).width;
    ctx.font = "600 64px Inter, system-ui, sans-serif";
    ctx.globalAlpha = 0.6;
    ctx.fillText(data.unit, 100 + w, 620);
    ctx.globalAlpha = 1;
  }

  ctx.font = "500 44px Inter, system-ui, sans-serif";
  ctx.globalAlpha = 0.75;
  wrapText(ctx, data.caption, 96, 720, W - 200, 58);
  ctx.globalAlpha = 1;

  // stats
  let y = 1080;
  for (const s of data.stats) {
    ctx.fillStyle = "#ffffff0f";
    roundRect(ctx, 90, y, W - 180, 140, 36);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.6;
    ctx.font = "600 32px Inter, system-ui, sans-serif";
    ctx.fillText(s.label, 130, y + 60);
    ctx.globalAlpha = 1;
    ctx.font = "800 56px Inter, system-ui, sans-serif";
    ctx.fillText(s.value, 130, y + 118);
    y += 168;
  }

  ctx.globalAlpha = 0.45;
  ctx.font = "500 30px Inter, system-ui, sans-serif";
  ctx.fillText("Acompanhamento nutricional com IA", 96, H - 110);
  ctx.globalAlpha = 1;

  return canvas;
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(" ");
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y);
      line = w;
      y += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, y);
}

export async function downloadCard(data: CardData) {
  const canvas = renderCard(data);
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `nutri-ia-${data.kind}.png`;
  a.click();
}

export async function shareCard(data: CardData, text: string) {
  const canvas = renderCard(data);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/png"));
  if (!blob) return false;
  const file = new File([blob], `nutri-ia-${data.kind}.png`, { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], text });
    return true;
  }
  await downloadCard(data);
  return false;
}
