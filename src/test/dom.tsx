import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

/**
 * Minimal render helper for jsdom component tests (no extra test library).
 * jsdom has no layout engine, so it lacks matchMedia and scrollIntoView; both are
 * stubbed here, and each render gets a fresh scrollIntoView mock to assert on.
 */
export function render(ui: ReactNode): { container: HTMLElement; unmount: () => void } {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  Element.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(ui);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

export function click(el: Element): void {
  act(() => {
    (el as HTMLElement).focus();
    (el as HTMLElement).click();
  });
}
