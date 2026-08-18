const TIMEZONE = "America/Sao_Paulo";

/**
 * O banco guarda tudo em UTC. Sem fixar o fuso aqui, a data exibida
 * mudaria conforme onde o codigo roda: um evento marcado para as 21h
 * em Belo Horizonte apareceria em outro horario para um servidor de
 * deploy rodando em UTC. Fixado porque a PLATAFORMA e para o Brasil,
 * nao porque o evento em si pertence a um fuso especifico.
 */
export function formatEventDateTime(iso: string): string {
  const date = new Date(iso);

  const weekday = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    timeZone: TIMEZONE,
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const day = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);

  const month = new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: TIMEZONE,
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIMEZONE,
  }).format(date);

  return `${weekday} ${day} ${month} · ${time}`;
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * ISO (UTC) -> valor aceito por <input type="datetime-local"> ("YYYY-MM-DDThh:mm"),
 * jah no fuso de Sao Paulo. O input nao carrega fuso nenhum: o organizador
 * ve e edita sempre em horario de Brasilia, consistente com o resto do app.
 */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/**
 * "YYYY-MM-DDThh:mm" do formulario -> ISO UTC.
 *
 * SIMPLIFICACAO ASSUMIDA: `new Date(...)` interpreta a string no fuso do
 * NAVEGADOR de quem preenche o formulario, nao necessariamente America/Sao_Paulo.
 * Para uma plataforma pensada para organizadores brasileiros usando navegadores
 * configurados no fuso do Brasil, isso da o resultado certo na pratica. Um
 * organizador acessando de outro fuso horario cadastraria o evento no horario
 * local DELE, nao no de Brasilia — limitacao conhecida, nao contornada aqui.
 */
export function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString();
}

/** "32,00" ou "32" -> 3200 (centavos). Aceita virgula ou ponto decimal. */
export function parsePriceToCents(input: string): number {
  const normalized = input.trim().replace(",", ".");
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value) || value < 0) return NaN;
  return Math.round(value * 100);
}