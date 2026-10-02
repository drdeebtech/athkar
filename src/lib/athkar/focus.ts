/**
 * For blur/focusout handlers on a popover's wrapper: true when focus moved to an
 * element outside it. An unknown target (window switch, tab change) is not
 * treated as leaving, so panels do not close when the user returns.
 */
export function leftContainer(container: Element, next: EventTarget | null): boolean {
  return next instanceof Node && !container.contains(next);
}
