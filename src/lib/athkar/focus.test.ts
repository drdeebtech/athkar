// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { leftContainer } from "./focus";

describe("leftContainer", () => {
  const container = document.createElement("div");
  const inside = document.createElement("button");
  const outside = document.createElement("a");
  container.appendChild(inside);
  document.body.append(container, outside);

  it("is true only when focus moved to an element outside the container", () => {
    expect(leftContainer(container, outside)).toBe(true);
    expect(leftContainer(container, inside)).toBe(false);
  });

  it("is false when the next target is unknown (e.g. switching apps), so panels stay open", () => {
    expect(leftContainer(container, null)).toBe(false);
  });
});
