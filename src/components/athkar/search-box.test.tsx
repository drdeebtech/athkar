// @vitest-environment jsdom
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resultsCount } from "@/lib/athkar/arabic";
import { getCategories } from "@/lib/athkar/data";
import { toSearchPayload } from "@/lib/athkar/search";
import { click, render } from "@/test/dom";
import { SearchBox } from "./search-box";

const CATALOGUE: unknown = JSON.parse(JSON.stringify(toSearchPayload(getCategories())));

let cleanup: () => void = () => {};
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Answers the search box's fetch of /search-index.json with `body`. */
function serve(body: unknown): void {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(body)));
}

/** Types like a user: React only sees a change when the native setter runs before the input event. */
function type(input: HTMLInputElement, value: string): void {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

/** Lets the stubbed fetch and res.json() resolve, then flushes React's updates. */
async function settle(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/** Focuses the box (which loads the index), waits for the load, then types `query`. */
async function search(query: string) {
  const { container, unmount } = render(<SearchBox />);
  cleanup = unmount;
  const input = container.querySelector<HTMLInputElement>('input[type="search"]')!;
  click(input);
  await settle();
  type(input, query);
  await settle();
  return {
    // "clay" alone marks the results panel; the input's frame is "clay-inset".
    panel: container.querySelector<HTMLElement>("div.clay")!,
    announcement: container.querySelector('[aria-live="polite"]')?.textContent,
    links: container.querySelectorAll('a[href^="/athkar/"]').length,
  };
}

describe("SearchBox", () => {
  // Hidden panels still hold their content, so the gate shows only in the
  // panel's hidden attribute and in what the live region announces.
  it("keeps the panel closed for one letter with a haraka", async () => {
    serve(CATALOGUE);
    const { panel, announcement } = await search("أَ");
    expect(panel.hidden).toBe(true);
    expect(announcement).toBe("");
  });

  it("shows results for the ﷲ ligature", async () => {
    serve(CATALOGUE);
    const { panel, announcement, links } = await search("ﷲ");
    expect(panel.hidden).toBe(false);
    expect(links).toBeGreaterThan(0);
    expect(announcement).toBe(resultsCount(links));
  });

  it("announces a load error when the index payload is malformed", async () => {
    serve([{ id: 95, title: "دعاء السفر", items: [{ id: "95-1", count: 1 }] }]);
    const { panel, announcement } = await search("سفر");
    expect(panel.hidden).toBe(false);
    expect(announcement).toBe("تعذّر تحميل البحث.");
  });
});
