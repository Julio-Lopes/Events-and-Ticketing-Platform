"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function SearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(initialQuery);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    router.push(trimmed ? `${pathname}?q=${encodeURIComponent(trimmed)}` : pathname);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="flex-1 flex items-center gap-2 bg-surface border border-line-soft px-3 focus-within:border-amber-dim transition-colors">
        <span className="font-mono text-[9px] tracking-[0.14em] text-muted-2 shrink-0">
          BUSCA
        </span>
        <span className="w-px h-4 bg-line shrink-0" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Título, local ou cidade"
          className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-ink placeholder:text-muted-2 outline-none"
        />
      </div>
      <button type="submit" className="stamp-btn px-4">
        BUSCAR
      </button>
    </form>
  );
}
