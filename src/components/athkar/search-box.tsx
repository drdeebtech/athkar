"use client";

import { Loader2, Search, X } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";
import { athkarCount, resultsCount } from "@/lib/athkar/arabic";
import { isSearchQuery, parseSearchIndex, searchIndex, type SearchIndex } from "@/lib/athkar/search";
import { leftContainer } from "@/lib/athkar/focus";

type IndexState = { status: "idle" | "loading" | "error" } | { status: "ready"; index: SearchIndex };

const MAX_RESULTS = 12;

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<IndexState>({ status: "idle" });
  const deferred = useDeferredValue(query);
  const inputId = useId();
  const listId = useId();
  const wrapper = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/search-index.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: unknown = await res.json();
      setState({ status: "ready", index: parseSearchIndex(data) });
    } catch {
      setState({ status: "error" });
    }
  };

  // Load once, lazily; after an error only the explicit retry button loads again.
  const ensureIndex = () => {
    if (state.status === "idle") void load();
  };

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  const results = useMemo(
    () => (state.status === "ready" ? searchIndex(state.index, deferred).slice(0, MAX_RESULTS) : []),
    [state, deferred],
  );
  const hasQuery = isSearchQuery(deferred);
  const showPanel = open && hasQuery;

  return (
    <div
      ref={wrapper}
      className="relative"
      onBlur={(e) => leftContainer(e.currentTarget, e.relatedTarget) && setOpen(false)}
    >
      <label htmlFor={inputId} className="sr-only">
        ابحث عن ذكر أو موقف
      </label>
      <div className="clay-inset flex items-center gap-2 px-5 text-foreground [--clay-r:9999px] focus-within:ring-3 focus-within:ring-ring">
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          id={inputId}
          ref={input}
          enterKeyHint="search"
          type="search"
          value={query}
          onFocus={() => {
            setOpen(true);
            ensureIndex();
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            ensureIndex();
          }}
          onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
          placeholder="ابحث: السفر، المطر، الهم، الكرب..."
          autoComplete="off"
          className="h-14 w-full bg-transparent text-lg outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
        />
        {state.status === "loading" && <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />}
        {query && (
          <button type="button" onClick={() => {
              setQuery("");
              input.current?.focus();
            }} aria-label="مسح البحث" className="rounded-md p-1 hover:bg-muted">
            <X className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {showPanel && state.status === "error"
          ? "تعذّر تحميل البحث."
          : showPanel && state.status === "ready"
            ? resultsCount(results.length)
            : ""}
      </p>

      <div
        id={listId}
        hidden={!showPanel}
        className="clay absolute inset-x-0 top-full z-20 mt-3 overflow-hidden text-popover-foreground [--clay-r:1.5rem]"
      >
        {state.status === "error" && (
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-destructive">
            <span>تعذّر تحميل البحث.</span>
            <button type="button" onClick={() => void load()} className="rounded-md border px-3 py-1 text-foreground hover:bg-muted">
              إعادة المحاولة
            </button>
          </div>
        )}
        {state.status === "ready" && results.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">لا توجد نتائج لـ «{deferred.trim()}»</p>
        )}
        {results.length > 0 && (
          <ul className="max-h-96 overflow-y-auto p-2">
            {results.map(({ category, titleMatch, textMatches }) => (
              <li key={category.id}>
                <Link href={`/athkar/${category.id}`} className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 hover:bg-muted">
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
    </div>
  );
}
