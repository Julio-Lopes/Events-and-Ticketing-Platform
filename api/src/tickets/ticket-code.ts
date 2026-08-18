import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

/**
 * Alfabeto sem caracteres ambiguos: sem 0/O, sem 1/I/L.
 * A portaria digita esse codigo a mao quando a camera falha, e as
 * confusoes classicas de leitura simplesmente nao existem aqui.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

function randomString(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  return out;
}

/** Formato ELT-XXXXX-XXXXX. Dez caracteres, cerca de 49 bits. */
export function generateTicketCode(): string {
  return `ELT-${randomString(5)}-${randomString(5)}`;
}

/** Token do link de compartilhamento, separado do codigo da portaria. */
export function generateShareToken(): string {
  return randomString(24);
}

/**
 * Payload do QR: "<ticketId>.<assinatura>".
 *
 * O id ja e um uuid, logo nao e adivinhavel. A assinatura resolve outra
 * coisa: permite a portaria rejeitar lixo antes de consultar o banco, e
 * garante que ninguem consiga fabricar um codigo valido mesmo que os ids
 * vazem. O segredo e o TICKET_SIGNING_SECRET, distinto do JWT_SECRET,
 * entao comprometer a sessao nao da poder de forjar ingresso.
 */
export function signTicket(ticketId: string, secret: string): string {
  return `${ticketId}.${hmac(ticketId, secret)}`;
}

export function verifyTicketPayload(payload: string, secret: string): string | null {
  const [ticketId, signature] = payload.split('.');
  if (!ticketId || !signature) return null;

  const expected = Buffer.from(hmac(ticketId, secret));
  const received = Buffer.from(signature);

  /**
   * Comparacao de tempo constante. Comparar com === vazaria, pelo tempo
   * de resposta, quantos caracteres iniciais o atacante acertou.
   */
  if (expected.length !== received.length) return null;
  return timingSafeEqual(expected, received) ? ticketId : null;
}

function hmac(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value).digest('base64url').slice(0, 32);
}