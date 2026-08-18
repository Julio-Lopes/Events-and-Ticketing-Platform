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
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por título, local ou cidade"
        className="flex-1 bg-surface border border-line rounded-sm px-3 py-2 text-sm text-ink placeholder:text-muted-2"
      />
      <button type="submit" className="btn-amber px-4">
        BUSCAR
      </button>
    </form>
  );
}