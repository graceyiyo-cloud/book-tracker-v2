import { newId } from "./browser-utils.js";
export const defaultState = () => ({
  page: "shelf",
  status: "all",
  query: "",
  year: "",
  rating: "0",
  words: "all",
  sort: "default",
  category: "",
  expanded: [],
  layers: [],
  scroll: 0,
});
export function createRouter(render, guard) {
  let state = defaultState(),
    restoring = false,
    onRestore = null;
  const session = Date.now().toString(36);
  const base = location.pathname + location.search;
  function url() {
    const top = state.layers.at(-1);
    return (
      base +
      (top ? "#" + top.type : state.page === "shelf" ? "" : "#" + state.page)
    );
  }
  function persist(replace) {
    history[replace ? "replaceState" : "pushState"](
      { ...state, session },
      "",
      url(),
    );
  }
  persist(true);
  history.scrollRestoration = "manual";
  function change(patch, replace = false) {
    state.scroll = scrollY;
    history.replaceState({ ...state, session }, "");
    state = { ...state, ...patch };
    persist(replace);
    render(state);
  }
  addEventListener("popstate", (e) => {
    if (restoring) {
      restoring = false;
      if (onRestore) {
        const fn = onRestore;
        onRestore = null;
        fn();
      }
      return;
    }
    const next = e.state?.session === session ? e.state : defaultState();
    const blocked = guard(state, next);
    if (blocked) {
      restoring = true;
      onRestore = () => {
        if (blocked === "busy") {
          render(state);
          return;
        }
        change({
          layers: [
            ...state.layers,
            { type: "discard", key: newId() },
          ],
        });
      };
      history.go(1);
      return;
    }
    state = next;
    render(state);
    window.scrollTo(0, state.scroll || 0);
  });
  return {
    get state() {
      return state;
    },
    change,
    pushLayer(layer) {
      change({
        layers: [
          ...state.layers,
          { ...layer, key: layer.key || newId() },
        ],
      });
    },
    back() {
      history.back();
    },
    go(n) {
      history.go(n);
    },
    reset() {
      state = defaultState();
      persist(true);
      render(state);
    },
    replaceLayers(layers) {
      change({ layers }, true);
    },
  };
}
