// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { getFeatured } from "@/lib/athkar/data";
import { render } from "@/test/dom";
import HomePage from "./page";

let cleanup: () => void = () => {};
afterEach(() => cleanup());

describe("home page quick links", () => {
  it("shows every featured situation, in the curated order", () => {
    const { container, unmount } = render(HomePage());
    cleanup = unmount;
    const links = [...container.querySelectorAll('nav[aria-label="الأكثر قراءة"] a')];
    expect(links.map((a) => [a.getAttribute("href"), a.textContent])).toEqual(
      getFeatured().map((c) => [`/athkar/${c.id}`, c.title]),
    );
    expect(links).toHaveLength(4);
  });
});
