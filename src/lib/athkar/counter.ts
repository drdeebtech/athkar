export interface CounterState {
  readonly target: number;
  readonly remaining: number;
}

export type CounterAction = { readonly type: "tap" } | { readonly type: "reset" };

export type CounterStatus = "idle" | "active" | "done";

export function createCounter(target: number): CounterState {
  const safe = Number.isFinite(target) && target >= 1 ? Math.floor(target) : 1;
  return { target: safe, remaining: safe };
}

export function counterReducer(state: CounterState, action: CounterAction): CounterState {
  switch (action.type) {
    case "tap":
      return state.remaining > 0 ? { ...state, remaining: state.remaining - 1 } : state;
    case "reset":
      return { ...state, remaining: state.target };
  }
}

export function counterStatus(state: CounterState): CounterStatus {
  if (state.remaining === 0) return "done";
  return state.remaining === state.target ? "idle" : "active";
}
