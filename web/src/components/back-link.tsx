import Link from "next/link";

/**
 * Link explicito para um destino conhecido, nao router.back().
 * router.back() depende do historico do navegador: se a pessoa abriu
 * a pagina direto por um link (ex.: retomou o pagamento de um pedido
 * salvo), nao ha historico nenhum para voltar, e o botao falharia
 * silenciosamente ou levaria para fora do site.
 */
export function BackLink({ href, label = "voltar" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-muted hover:text-amber"
    >
      <span aria-hidden>‹</span> {label}
    </Link>
  );
}