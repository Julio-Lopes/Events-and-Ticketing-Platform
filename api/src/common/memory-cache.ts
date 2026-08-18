/**
 * Cache em memoria com TTL, deliberadamente burro.
 *
 * Existe por um motivo pratico: o Ticketmaster limita requisicoes por dia
 * e por segundo, e o organizador digitando numa busca dispara chamada a cada
 * tecla. Redis resolveria melhor, mas seria infra a mais para um problema
 * que um Map resolve. Se o processo reiniciar, perde o cache e tudo bem.
 */
export class MemoryCache<T> {
  private store = new Map<string, { value: T; expiresAt: number }>();

  constructor(private ttlMs: number) {}

  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (hit.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  async wrap(key: string, fn: () => Promise<T>): Promise<T> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await fn();
    this.set(key, value);
    return value;
  }
}