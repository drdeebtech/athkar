// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { getSituation } from "@/lib/athkar/data";
import { render } from "@/test/dom";
import CategoryPage from "./page";

let cleanup: () => void = () => {};
afterEach(() => cleanup());

/** Renders the situation page for an id, as the static export does. */
async function renderSituation(id: number): Promise<HTMLElement> {
  const ui = await CategoryPage({ params: Promise.resolve({ id: String(id) }) });
  const { container, unmount } = render(ui);
  cleanup = unmount;
  return container;
}

const hrefOf = (a: Element | null | undefined) => a?.getAttribute("href");

describe("situation page", () => {
  // Evening adhkar: in the "daily" section (hue 60, not the 165 fallback), with
  // a situation before and after it, so every wiring below is observable.
  const situation = getSituation(2)!;

  it("uses the section's hue", async () => {
    const page = await renderSituation(2);
    expect(situation.section.hue).not.toBe(165);
    expect((page.firstElementChild as HTMLElement).style.getPropertyValue("--hue")).toBe(String(situation.section.hue));
  });

  it("links the breadcrumb to the section and ends on the current page", async () => {
    const crumbs = (await renderSituation(2)).querySelector('nav[aria-label="مسار التصفح"]')!;
    const sectionLink = [...crumbs.querySelectorAll("a")].find((a) => a.textContent === situation.section.title);
    expect(hrefOf(sectionLink)).toBe(`/#section-${situation.section.id}`);
    expect(crumbs.querySelector('[aria-current="page"]')?.textContent).toBe(situation.category.title);
  });

  it("links the previous and next situations in reading order", async () => {
    const nav = (await renderSituation(2)).querySelector('nav[aria-label="التنقل بين المواقف"]')!;
    const [prev, next] = [...nav.querySelectorAll("a")];
    expect(hrefOf(prev)).toBe(`/athkar/${situation.prev!.id}`);
    expect(prev.textContent).toContain(situation.prev!.title);
    expect(hrefOf(next)).toBe(`/athkar/${situation.next!.id}`);
    expect(next.textContent).toContain(situation.next!.title);
  });

  it("lists the other situations of the same section, not itself", async () => {
    const related = (await renderSituation(2)).querySelector('section[aria-labelledby="same-section"]')!;
    const hrefs = [...related.querySelectorAll("a")].map(hrefOf);
    expect(hrefs).toContain(`/athkar/${situation.prev!.id}`);
    expect(hrefs).not.toContain(`/athkar/${situation.category.id}`);
  });
});
