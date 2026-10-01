"use client";

import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useId, useMemo, useRef, useState } from "react";
import { athkarCount, resultsCount } from "@/lib/athkar/arabic";
import { searchCategories } from "@/lib/athkar/search";
import type { Category } from "@/lib/athkar/types";

type IndexState = { status: "idle" | "loading" | "error" } | { status: "ready"; categories: Category[] };

const MAX_RESULTS = 12;

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<IndexState>({ status: "idle" });
  const deferred = useDeferredValue(query);
  const inputId = useId();
  const loading = useRef(false);

  const ensureIndex = async () => {
    if (loading.current || index.status === "ready") return;
    loading.current = true;
    setIndex({ status: "loading" });
    try {
      const res = await fetch("/search-index.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setIndex({ status: "ready", categories: (await res.json()) as Category[] });
    } catch {
      setIndex({ status: "error" });
    } finally {
      loading.current = false;
    }
  };

  const results = useMemo(
    () => (index.status === "ready" ? searchCategories(index.categories, deferred).slice(0, MAX_RESULTS) : []),
    [index, deferred],
  );
  const hasQuery = deferred.trim().length >= 2;

  return (
    <div className="relative">
      <label htmlFor={inputId} className="sr-only">
        ابحث عن ذكر أو موقف
      </label>
      <div className="flex items-center gap-2 rounded-2xl border-2 border-white/20 bg-card px-4 text-card-foreground shadow-lg focus-within:border-accent">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id={inputId}
          type="search"
          value={query}
          onFocus={ensureIndex}
          onChange={(e) => {
            setQuery(e.target.value);
            void ensureIndex();
          }}
          placeholder="ابحث: السفر، المطر، الهم، الكرب..."
          autoComplete="off"
          className="h-14 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground/80"
        />
        {index.status === "loading" && <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />}
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث" className="rounded-md p-1 hover:bg-muted">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-xl">
          <p className="sr-only" aria-live="polite">
            {index.status === "ready" ? resultsCount(results.length) : ""}
          </p>
          {index.status === "error" && <p className="p-4 text-sm text-destructive">تعذّر تحميل البحث، حاول مرة أخرى.</p>}
          {index.status === "ready" && results.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">لا توجد نتائج لـ «{deferred.trim()}»</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-96 divide-y overflow-y-auto">
              {results.map(({ category, titleMatch, textMatches }) => (
                <li key={category.id}>
                  <Link href={`/athkar/${category.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted">
                    <span className="font-zekr text-lg font-bold">{category.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {titleMatch ? athkarCount(category.items.length) : `${resultsCount(textMatches)} في النص`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
