import { newId, copyText } from "./browser-utils.js";
import { renderPage, renderLayer } from "./views.js?v=20260915-status";
import { createDemoRepository, loadCloud, lookupBook } from "./repository.js";
import {
  DEFAULT_CATEGORIES,
  today,
  filterBooks,
  finishPatch,
  dropPatch,
  rereadPatch,
  normalizeBook,
  listText,
} from "./book-logic.js";
import { createRouter, defaultState } from "./router.js";

const model = {
  mode: null,
  books: [],
  categories: [...DEFAULT_CATEGORIES],
  account: "",
  sync: "idle",
  busy: false,
  drafts: {},
  loginStep: "home",
  loginError: "",
};
const dirty = new Set();
let repository, cloud, unsubscribe, lastLayerKey, toastTimer, afterBack;
const top = () => router.state.layers.at(-1);
const router = createRouter(
  (state) => {
    model.state = state;
    render();
    if (afterBack) {
      const fn = afterBack;
      afterBack = null;
      fn();
    }
  },
  (old, next) => {
    if (model.busy) {
      toast("正在儲存，請稍候");
      return "busy";
    }
    return old.layers.some(
      (l) => dirty.has(l.key) && !next.layers.some((n) => n.key === l.key),
    );
  },
);
model.state = router.state;
function toast(message) {
  clearTimeout(toastTimer);
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.getElementById("toast").replaceChildren(node);
  toastTimer = setTimeout(
    () => document.getElementById("toast").replaceChildren(),
    3800,
  );
}
function render() {
  const active = document.activeElement;
  const focus = {
    id: active?.id,
    name: active?.name,
    start: active?.selectionStart,
    end: active?.selectionEnd,
  };
  const scroll = document.querySelector(".panel")?.scrollTop || 0;
  const oldKey = lastLayerKey;
  lastLayerKey = top()?.key;
  document.getElementById("app").innerHTML = renderPage(model);
  document.getElementById("layer").innerHTML = renderLayer(model);
  document.getElementById("app").inert = !!top();
  document.body.style.overflow = top() ? "hidden" : "";
  if (model.busy)
    document
      .querySelectorAll("button,input,select,textarea")
      .forEach((el) => (el.disabled = true));
  if (lastLayerKey === oldKey) {
    const panel = document.querySelector(".panel");
    if (panel) panel.scrollTop = scroll;
    const field = focus.id
      ? document.getElementById(focus.id)
      : focus.name
        ? document.querySelector(`[name="${CSS.escape(focus.name)}"]`)
        : null;
    if (field) {
      field.focus({ preventScroll: true });
      if (
        ["text", "search", "textarea", "password", ""].includes(field.type) &&
        focus.start != null
      )
        try {
          field.setSelectionRange(focus.start, focus.end);
        } catch {}
    }
  } else if (top()) {
    requestAnimationFrame(() =>
      document.querySelector(".panel button")?.focus({ preventScroll: true }),
    );
  }
}
function change(patch, replace = false) {
  router.change(patch, replace);
  model.state = router.state;
}
function backThen(fn) {
  afterBack = fn;
  router.back();
}
function open(type, extra = {}, draft) {
  const key = newId();
  if (draft) model.drafts[key] = structuredClone(draft);
  router.pushLayer({ type, ...extra, key });
}
function openForm(type, id) {
  const b = model.books.find((b) => b.id === id);
  if (type !== "add" && !b) return;
  const draft =
    type === "add"
      ? {
          title: "",
          author: "",
          wordCount: "",
          isWordCountManual: false,
          addDate: today(),
          reviewUrl: "",
          synopsis: "",
          category: [],
          isPinned: false,
          isReadingNow: false,
        }
      : type === "edit"
        ? {
            ...b,
            category: [...(b.category || [])],
            finishDate: b.finishDate || b.addDate || "",
            dropDate: b.dropDate || b.addDate || "",
          }
        : {
            date:
              type === "finish"
                ? b.finishDate || today()
                : b.dropDate || today(),
            rating: b.rating || 0,
            review: b.review || "",
            chapter: b.dropChapter || "",
            dropReason: b.dropReason || "",
          };
  open(type, { id }, draft);
}
function confirmAction(action, title, message, id, label) {
  open("confirm", { action, title, message, id, label });
}
async function perform(fn, success) {
  if (model.busy) return;
  model.busy = true;
  render();
  try {
    await fn();
    model.busy = false;
    success?.();
    render();
  } catch (error) {
    model.busy = false;
    toast(error.message || "儲存失敗，請重試");
    render();
  }
}
function subscribe() {
  unsubscribe?.();
  model.sync = "loading";
  render();
  unsubscribe = repository.subscribe(
    (data) => {
      model.books = data.books;
      model.categories = data.categories;
      model.sync = "ready";
      render();
    },
    (error) => {
      model.sync = "error";
      render();
      toast("無法讀取書櫃：" + (error.code || "請檢查連線"));
    },
  );
}
function enterDemo() {
  model.mode = "demo";
  model.account = "示範書櫃";
  repository = createDemoRepository(localStorage);
  subscribe();
}
function enterCloud(id) {
  model.account = id;
  model.mode = "cloud";
  repository = cloud.repository(id);
  model.loginError = "";
  subscribe();
}
async function auth(action) {
  model.loginError = "";
  model.busy = true;
  render();
  try {
    cloud ??= await loadCloud();
    const result = await action(cloud);
    model.busy = false;
    if (result?.id) enterCloud(result.id);
    else if (result?.needsLink) {
      model.loginStep = "link";
      render();
    } else {
      model.loginStep = "home";
      render();
    }
  } catch (error) {
    model.busy = false;
    model.loginError = error.message || "登入失敗，請重試";
    model.loginStep = "home";
    render();
  }
}
function clearSearch() {
  change({ query: "" });
  document.getElementById("search")?.focus();
}
function updateDraft(input) {
  const key = input.closest("form")?.dataset.key;
  if (!key || !model.drafts[key] || !input.name) return;
  model.drafts[key][input.name] = input.value;
  if (input.name === "wordCount") model.drafts[key].isWordCountManual = true;
  if (["bookForm", "recordForm"].includes(input.closest("form").id))
    dirty.add(key);
}
function categoryLayer() {
  return router.state.layers.findLast((l) => l.type === "categories");
}
async function addCategories() {
  const layer = categoryLayer();
  if (!layer) return;
  const tokens = (layer.query || "")
    .trim()
    .split(/[，,\s]+/)
    .filter(Boolean);
  if (!tokens.length) {
    toast("請先輸入分類名稱");
    return;
  }
  await perform(
    async () => {
      const next = [...new Set([...model.categories, ...tokens])];
      if (next.length !== model.categories.length)
        await repository.categories(next);
      if (layer.formKey) {
        const d = model.drafts[layer.formKey];
        d.category = [...new Set([...d.category, ...tokens])];
        dirty.add(layer.formKey);
      }
    },
    () => {
      change(
        {
          layers: router.state.layers.map((l) =>
            l.key === layer.key ? { ...l, query: "" } : l,
          ),
        },
        true,
      );
      document.getElementById("categorySearch")?.focus();
    },
  );
}
function handleInput(e) {
  // Keep the focused input intact until Chinese IME composition finishes.
  if (e.isComposing) return;
  const input = e.target;
  if (input.id === "search") {
    const first = !router.state.query || router.state.page !== "shelf";
    change({ page: "shelf", query: input.value }, !first);
  } else if (input.id === "categorySearch") {
    change(
      {
        layers: router.state.layers.map((l) =>
          l.key === top().key ? { ...l, query: input.value } : l,
        ),
      },
      true,
    );
  } else updateDraft(input);
}
document.addEventListener("input", handleInput);
document.addEventListener("compositionend", handleInput);
document.addEventListener("change", (e) => updateDraft(e.target));
document.addEventListener("click", async (e) => {
  const el = e.target.closest("[data-act]");
  if (!el || model.busy) return;
  const { act, id, value } = el.dataset,
    b = model.books.find((b) => b.id === id),
    layer = top();
  if (act === "back") router.back();
  else if (act === "page") {
    if (router.state.page !== value) change({ ...defaultState(), page: value });
  } else if (act === "status") {
    if (router.state.status !== value) change({ status: value });
  } else if (act === "quickSearch" || act === "categorySearch")
    change({ page: "shelf", query: value, layers: [] });
  else if (act === "clearSearch") clearSearch();
  else if (act === "clear") {
    change({ [value]: defaultState()[value] });
    if (value === "query") document.getElementById("search")?.focus();
  } else if (act === "resetFilters") change({ ...defaultState() });
  else if (act === "year")
    change({
      page: "shelf",
      year: router.state.year === value ? "" : value,
      layers: [],
    });
  else if (act === "synopsis")
    change({
      expanded: router.state.expanded.includes(id)
        ? router.state.expanded.filter((v) => v !== id)
        : [...router.state.expanded, id],
    });
  else if (act === "toggleAllSynopses") {
    const synopsisIds = filterBooks(model.books, router.state)
      .filter((book) => book.synopsis)
      .map((book) => book.id);
    const synopsisSet = new Set(synopsisIds);
    const allExpanded = synopsisIds.every((bookId) =>
      router.state.expanded.includes(bookId),
    );
    change({
      expanded: allExpanded
        ? router.state.expanded.filter((bookId) => !synopsisSet.has(bookId))
        : [...new Set([...router.state.expanded, ...synopsisIds])],
    });
  } else if (act === "filter")
    open(
      "filter",
      {},
      Object.fromEntries(
        ["year", "rating", "words", "category", "sort"].map((k) => [
          k,
          router.state[k],
        ]),
      ),
    );
  else if (act === "resetFilterForm") {
    const d = model.drafts[layer.key];
    for (const k of Object.keys(d)) d[k] = defaultState()[k];
    render();
  } else if (["add", "edit", "finish", "drop"].includes(act)) openForm(act, id);
  else if (act === "detail" || act === "menu") open(act, { id });
  else if (act === "toggleReading" && b)
    await perform(
      () => repository.update(id, { isReadingNow: !b.isReadingNow }),
      () => toast(b.isReadingNow ? "已取消正在閱讀" : "已標記正在閱讀"),
    );
  else if (act === "pin" && b)
    await perform(
      () => repository.update(id, { isPinned: !b.isPinned }),
      () => toast(b.isPinned ? "已取消置頂" : "已置頂"),
    );
  else if (act === "reread" && b)
    confirmAction(
      "reread",
      "恢復閱讀／重讀？",
      `《${b.title}》將恢復為未讀。依照原版規則，會清除完食日期、評分、心得、棄書日期、章節與理由。`,
      id,
      "恢復閱讀",
    );
  else if (act === "delete" && b)
    confirmAction(
      "delete",
      "刪除這本書？",
      `《${b.title}》將從${model.mode === "demo" ? "示範" : "你的雲端"}書櫃刪除。${model.mode === "demo" ? "不會影響正式書單。" : "此操作無法復原。"}`,
      id,
      "刪除書籍",
    );
  else if (act === "resetDemo" && model.mode === "demo")
    confirmAction(
      "resetDemo",
      "只重設示範書單？",
      "只清除新版示範模式的測試紀錄，恢復 8 本虛構書籍。你的正式書單與 Firebase 雲端資料完全不受影響。",
      null,
      "只重設示範",
    );
  else if (act === "logout")
    confirmAction(
      "logout",
      model.mode === "demo" ? "離開示範模式？" : "登出書櫃？",
      model.mode === "demo"
        ? "示範紀錄會保留在此瀏覽器，下次試用仍可看到。"
        : "登出後會清除本機登入記憶，雲端書單保持不變。",
      null,
      "確認登出",
    );
  else if (act === "confirmAction") {
    const action = layer.action;
    await perform(
      async () => {
        if (action === "delete") await repository.remove(layer.id);
        if (action === "reread")
          await repository.update(layer.id, rereadPatch());
        if (action === "resetDemo") await repository.reset();
        if (action === "deleteCategory")
          await repository.categories(
            model.categories.filter((c) => c !== layer.id),
          );
        if (action === "logout" && model.mode === "cloud") await cloud.logout();
      },
      () => {
        if (action === "logout") {
          unsubscribe?.();
          model.books = [];
          model.categories = [...DEFAULT_CATEGORIES];
          location.assign(location.pathname);
          return;
        }
        if (action === "delete") {
          router.replaceLayers([]);
        } else router.back();
        toast(action === "resetDemo" ? "已恢復 8 本虛構示範書籍" : "已完成");
      },
    );
  } else if (act === "pickCategories")
    open("categories", { formKey: layer.key, query: "" });
  else if (act === "manageCategories") open("categories", { query: "" });
  else if (act === "unselectCategory") {
    model.drafts[layer.key].category = model.drafts[layer.key].category.filter(
      (c) => c !== value,
    );
    dirty.add(layer.key);
    render();
  } else if (act === "selectCategory") {
    const l = categoryLayer(),
      d = model.drafts[l.formKey];
    d.category = d.category.includes(value)
      ? d.category.filter((c) => c !== value)
      : [...d.category, value];
    dirty.add(l.formKey);
    change(
      {
        layers: router.state.layers.map((x) =>
          x.key === l.key ? { ...x, query: "" } : x,
        ),
      },
      true,
    );
    document.getElementById("categorySearch")?.focus();
  } else if (act === "addCategory") await addCategories();
  else if (act === "deleteCategory")
    confirmAction(
      "deleteCategory",
      "移除分類選項？",
      `只移除「${id}」分類選項，書籍及書籍原有標籤會保留。`,
      id,
      "移除分類",
    );
  else if (act === "star") {
    const rect = el.getBoundingClientRect();
    const rating =
      Number(value) -
      (e.detail !== 0 && e.clientX - rect.left < rect.width / 2 ? 0.5 : 0);
    model.drafts[layer.key].rating = rating;
    dirty.add(layer.key);
    render();
  } else if (act === "lookup") {
    const d = model.drafts[layer.key];
    if (!d.title.trim()) {
      toast("請先輸入書名");
      return;
    }
    await perform(async () => {
      const result = await lookupBook(d.title, d.author);
      open("lookup", { formKey: layer.key, result });
    });
  } else if (act === "applyLookup") {
    const d = model.drafts[layer.formKey];
    Object.assign(d, {
      author: d.author || layer.result.author,
      wordCount: layer.result.wordCount,
      synopsis: layer.result.synopsis,
    });
    dirty.add(layer.formKey);
    router.back();
  } else if (act === "discard") {
    const removed = router.state.layers.at(-2);
    if (removed) dirty.delete(removed.key);
    router.go(-2);
  } else if (act === "copy") {
    const list = filterBooks(model.books, router.state);
    if (!list.length) {
      toast("目前清單沒有可複製的內容");
      return;
    }
    try {
      await copyText(listText(list));
      toast("清單文字已複製");
    } catch {
      toast("複製失敗，請檢查瀏覽器剪貼簿權限");
    }
  } else if (act === "retry") subscribe();
  else if (act === "demo") {
    const url = new URL(location.href);
    url.searchParams.set("demo", "1");
    url.hash = "";
    location.assign(url.href);
  } else if (act === "legacy") {
    model.loginStep = "legacy";
    model.loginError = "";
    render();
  } else if (act === "loginHome") {
    model.loginStep = "home";
    render();
  } else if (act === "google") await auth((c) => c.google());
  else if (act === "newShelf") await auth((c) => c.newShelf());
});
document.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (model.busy) return;
  const form = e.target,
    values = Object.fromEntries(new FormData(form)),
    layer = top();
  if (form.id === "loginForm") {
    await auth((c) => c.legacy(values.account, values.password));
    return;
  }
  if (form.id === "filterForm") {
    backThen(() => change(values));
    return;
  }
  if (form.id === "bookForm") {
    const d = model.drafts[layer.key];
    Object.assign(d, values);
    if (!d.title.trim()) {
      toast("請輸入書名");
      form.elements.title.focus();
      return;
    }
    const old = model.books.find((b) => b.id === layer.id),
      patch = normalizeBook(d, old);
    await perform(
      () =>
        old
          ? repository.update(old.id, patch)
          : repository.add({ ...patch, isPinned: false, isReadingNow: false }),
      () => {
        dirty.delete(layer.key);
        router.back();
        toast(old ? "更新成功" : "已存入書櫃");
      },
    );
  } else if (form.id === "recordForm") {
    await perform(
      () =>
        repository.update(
          layer.id,
          layer.type === "finish" ? finishPatch(values) : dropPatch(values),
        ),
      () => {
        dirty.delete(layer.key);
        router.back();
        toast("閱讀紀錄已更新");
      },
    );
  }
});
document.addEventListener("keydown", (e) => {
  if (e.isComposing || e.keyCode === 229) return;
  if (e.key === "Enter" && e.target.id === "categorySearch") {
    e.preventDefault();
    addCategories();
  }
  if (e.key === "Escape" && top()) {
    e.preventDefault();
    if (!model.busy) router.back();
  }
  if (e.key === "Tab" && top()) {
    const nodes = [
        ...document.querySelectorAll(
          ".panel button,.panel input,.panel textarea,.panel select,.panel a",
        ),
      ].filter((n) => !n.disabled && n.getClientRects().length),
      first = nodes[0],
      last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
addEventListener("beforeunload", (e) => {
  if (dirty.size || model.busy) {
    e.preventDefault();
    e.returnValue = "";
  }
});
render();
if (new URLSearchParams(location.search).get("demo") === "1") enterDemo();
else {
  model.loginStep = "checking";
  render();
  auth((c) => c.restore());
}
