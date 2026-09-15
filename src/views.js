import { ico, esc } from "./icons.js";
import {
  labels,
  kind,
  filterBooks,
  stats,
  wordText,
  searchUrl,
  dateValue,
  wordOptions,
  ratingOptions,
} from "./book-logic.js";
const button = (act, text, icon = "", extra = "") =>
  `<button class="btn" data-act="${act}" ${extra}>${icon ? ico(icon) : ""}${text}</button>`;
const iconButton = (act, label, icon, id = "") =>
  `<button class="icon" data-act="${act}" data-id="${esc(id)}" aria-label="${esc(label)}" title="${esc(label)}">${ico(icon)}</button>`;
const status = (b) =>
  `<span class="status ${b.status === "dropped" ? "dropped" : ""}">${kind(b) === "reading" ? "未讀" : labels[kind(b)]}</span>`;
const stars = (rating) => {
  const value = Math.max(0, Math.min(5, Number(rating) || 0));
  if (!value) return "";
  return (
    '<span class="rating-display" role="img" aria-label="評分 ' +
    value +
    ' 星" title="' +
    value +
    ' 星">' +
    [1, 2, 3, 4, 5]
      .map(
        (n) =>
          '<span class="display-star">' +
          ico("star") +
          '<span class="display-star-fill" style="width:' +
          Math.max(0, Math.min(1, value - n + 1)) * 100 +
          '%">' +
          ico("star") +
          "</span></span>",
      )
      .join("") +
    "</span>"
  );
};
export function linkedText(text) {
  return String(text || "")
    .split(/(https?:\/\/[^\s]+)/g)
    .map((part) =>
      /^https?:\/\//.test(part)
        ? `<a href="${esc(part)}" target="_blank" rel="noopener noreferrer">${esc(part)}</a>`
        : esc(part),
    )
    .join("");
}
function tags(b) {
  return (b.category || [])
    .map(
      (t) =>
        `<button class="tag" data-act="quickSearch" data-value="${esc(t)}" title="搜尋分類 ${esc(t)}">${esc(t)}</button>`,
    )
    .join("");
}
function bookRow(b, i, m) {
  const expanded = m.state.expanded.includes(b.id);
  return `<article class="book" data-book="${esc(b.id)}"><span class="book-index">${String(i + 1).padStart(2, "0")}</span><div class="book-body"><a class="book-title" href="${esc(searchUrl(b.title, b.author))}" target="_blank" rel="noopener noreferrer" title="搜尋書名與作者">${esc(b.title)} ${ico("link")}</a><div class="meta"><button class="meta-link" data-act="quickSearch" data-value="${esc(b.author || "佚名")}">${esc(b.author || "佚名")}</button><span>${wordText(b)}</span><span>${esc(dateValue(b) || "")}</span>${b.isPinned ? "<span>置頂</span>" : ""}</div><div class="tags">${tags(b)}${stars(b.rating)}</div></div><div class="book-side"><div class="book-badges">${status(b)}${iconButton("detail", `查看《${b.title}》詳情`, "book", b.id)}</div><div class="row-actions">${b.status === "reading" ? `<button class="book-action" data-act="${b.isReadingNow ? "finish" : "toggleReading"}" data-id="${esc(b.id)}">${b.isReadingNow ? "記錄完食" : "開始閱讀"}${ico("arrow")}</button>` : `<button class="book-action" data-act="${b.status === "finished" ? "finish" : "drop"}" data-id="${esc(b.id)}">編輯紀錄${ico("edit")}</button>`}${iconButton("menu", `《${b.title}》更多操作`, "more", b.id)}</div></div><div class="book-notes">${b.reviewUrl ? `<div class="book-links">${ico("link")}<div>${linkedText(b.reviewUrl)}</div></div>` : ""}${b.status === "finished" ? `<div class="record-summary"><span>完食於 ${esc(b.finishDate || "未填日期")}</span>${iconButton("finish", "修改完食紀錄", "edit", b.id)}${b.review ? `<p>${esc(b.review)}</p>` : ""}</div>` : b.status === "dropped" ? `<div class="record-summary dropped"><span>${esc(b.dropDate || "未填日期")} · 第 ${esc(b.dropChapter || "?")} 章棄書</span>${iconButton("drop", "修改棄書紀錄", "edit", b.id)}${b.dropReason ? `<p>${esc(b.dropReason)}</p>` : ""}</div>` : ""}${b.synopsis ? `<button class="synopsis-toggle" data-act="synopsis" data-id="${esc(b.id)}" aria-expanded="${expanded}">${ico("book")}${expanded ? "收合大綱" : "大綱"}</button>${expanded ? `<div class="synopsis-text prose">${esc(b.synopsis)}</div>` : ""}` : ""}</div></article>`;
}
function nav(m, cls) {
  return `<nav class="${cls}" aria-label="主要導覽">${[
    ["shelf", "book", "書櫃"],
    ["review", "chart", "回顧"],
    ["settings", "settings", "設定"],
  ]
    .map(
      ([p, i, l]) =>
        `<button data-act="page" data-value="${p}" class="${m.state.page === p ? "active" : ""}" ${m.state.page === p ? 'aria-current="page"' : ""}>${ico(i)}<span>${l}</span></button>`,
    )
    .join("")}</nav>`;
}
function shelf(m) {
  const s = stats(m.books),
    f = m.state,
    list = filterBooks(m.books, f);
  const synopsisIds = list.filter((b) => b.synopsis).map((b) => b.id);
  const allSynopsesExpanded =
    synopsisIds.length > 0 &&
    synopsisIds.every((id) => f.expanded.includes(id));
  const filters = [
    ["query", f.query && "搜尋：" + f.query],
    ["year", f.year && f.year + " 年"],
    ["category", f.category],
    ["rating", Number(f.rating) > 0 && f.rating + " 星以上"],
    [
      "words",
      f.words !== "all" && wordOptions.find((x) => x[0] === f.words)?.[1],
    ],
    [
      "sort",
      f.sort !== "default" &&
        (f.sort === "title" ? "依書名排列" : "高評分優先"),
    ],
  ].filter((x) => x[1]);
  return `<div class="tabs" role="group" aria-label="閱讀狀態">${Object.entries(
    labels,
  )
    .map(
      ([v, l]) =>
        `<button data-act="status" data-value="${v}" aria-pressed="${f.status === v}" class="${f.status === v ? "active" : ""}">${l}<span class="count">${v === "all" ? m.books.length : s[v]}</span></button>`,
    )
    .join(
      "",
    )}</div><div class="toolbar"><small>共 ${list.length} 本書${f.status === "reading" ? " · 含正在閱讀" : ""}</small>${synopsisIds.length ? button("toggleAllSynopses", allSynopsesExpanded ? "收合全部大綱" : "展開全部大綱", "book") : ""}${button("filter", "篩選・排序", "filter")}${iconButton("copy", "複製目前書單", "copy")}</div>${filters.length ? `<div class="chips">${filters.map(([key, label]) => `<button class="chip" data-act="clear" data-value="${key}">${esc(label)}${ico("close")}</button>`).join("")}<button class="chip" data-act="resetFilters">清除全部條件</button></div>` : ""}<div class="workspace"><div class="books">${m.sync === "loading" ? '<p class="empty">正在載入你的書櫃…</p>' : list.length ? list.map((b, i) => bookRow(b, i, m)).join("") : `<div class="empty">${ico("book")}<h2>${m.sync === "error" ? "書櫃暫時無法載入" : m.books.length ? "沒有符合條件的書" : "這一頁，還留著空白"}</h2><p>${m.sync === "error" ? "請檢查連線後再試，原有雲端資料不會被清除。" : m.books.length ? "試試其他關鍵字，或清除篩選。" : "從記錄第一本書開始。"}</p>${button(m.sync === "error" ? "retry" : m.books.length ? "resetFilters" : "add", m.sync === "error" ? "重新載入" : m.books.length ? "清除條件" : "新增第一本書")}</div>`}</div><aside class="rail"><div class="note"><span class="eyebrow">BETWEEN THE PAGES</span><h2>閱讀有自己的步調。</h2><p>有些故事一口氣讀完，<br>有些適合慢慢放在心上。</p><hr><span class="small-label">此刻的書頁</span><p style="margin-top:8px">${s.now} 本正在閱讀<br>${s.reading - s.now} 本等待翻開</p></div><section class="rail-section"><h3>留在書頁裡的日子</h3><div class="mini-stats"><div><strong>${s.finished}</strong><span>本已完食</span></div><div><strong>${s.dropped}</strong><span>本暫時告別</span></div></div><button class="book-action" data-act="page" data-value="review">翻閱閱讀回顧 ${ico("arrow")}</button>${yearCards(s, f)}<p class="rail-note">${m.mode === "demo" ? "這裡使用虛構書籍。<br>示範資料只儲存在此瀏覽器。" : "書名可直接搜尋書名與作者。<br>書本圖示可查看完整詳情。"}</p></section></aside></div>`;
}
function yearCards(s, f) {
  return `<div class="year-cards">${Object.keys(s.years)
    .sort()
    .reverse()
    .map(
      (y) =>
        `<button class="year-card ${f.year === y ? "active" : ""}" data-act="year" data-value="${y}"><span>${y} 年</span><span>完食 ${s.years[y].finished} · 棄書 ${s.years[y].dropped}</span></button>`,
    )
    .join("")}</div>`;
}
function review(m) {
  const s = stats(m.books),
    groups = {};
  m.books
    .filter((b) => ["finished", "dropped"].includes(b.status))
    .forEach((b) => {
      const date = b.status === "finished" ? b.finishDate : b.dropDate;
      const key =
        date?.match(/^\d{4}[-/]\d{1,2}/)?.[0].replace("/", "-") || "未填日期";
      (groups[key] ??= []).push(b);
    });
  return `<section class="reading-summary" aria-label="閱讀統計"><div class="summary-item"><span class="summary-icon">${ico("check")}</span><span class="summary-label">累計完食</span><strong>${s.finished}<small>本</small></strong></div><div class="summary-item"><span class="summary-icon">${ico("book")}</span><span class="summary-label">暫別的故事</span><strong>${s.dropped}<small>本</small></strong></div><div class="summary-item"><span class="summary-icon">${ico("star")}</span><span class="summary-label">四星以上</span><strong>${m.books.filter((b) => b.rating >= 4).length}<small>本</small></strong></div></section><h2 class="section-title">年度紀錄 · 點選查看書單</h2>${yearCards(s, m.state)}${
    Object.keys(groups)
      .sort()
      .reverse()
      .map(
        (k) =>
          `<h3 class="timeline-heading">${esc(k === "未填日期" ? k : k.replace("-", " 年 ") + " 月")}</h3>${groups[k].map((b, i) => bookRow(b, i, m)).join("")}`,
      )
      .join("") || '<div class="empty">記下第一本完食，回顧就從這裡開始。</div>'
  }`;
}
function settings(m) {
  return `<div class="intro"><div><h1>手帳設定</h1><p>留一個舒服的位置，給自己的閱讀習慣。</p></div></div><section class="settings-card"><span class="eyebrow">YOUR READING ROOM</span><h2 style="margin-top:12px">${m.mode === "demo" ? "示範閱讀空間" : "我的雲端書櫃"}</h2><p>${m.mode === "demo" ? "此模式使用虛構書籍，本機測試資料與正式 Firebase 書單完全分開。" : `書櫃 ID：${esc(m.account)}<br>沿用原有的書櫃資料與分類設定。`}</p><span class="status">${syncLabel(m)}</span><div style="margin-top:20px">${button("logout", m.mode === "demo" ? "離開示範模式" : "登出")}</div></section><section class="settings-card"><h3>題材分類</h3><p>搜尋、新增或移除分類選項。從分類選項移除，不會刪除書籍或書籍已存的標籤。</p>${button("manageCategories", `管理 ${m.categories.length} 個分類`, "edit")}</section>${m.mode === "demo" ? `<section class="settings-card"><h3>重新體驗</h3><p>只重設這份示範模式的紀錄，恢復 8 本虛構書籍。你的正式書單與 Firebase 雲端資料完全不受影響。</p>${button("resetDemo", "重設示範資料（不影響正式書單）")}</section>` : ""}`;
}
export function syncLabel(m) {
  return m.busy
    ? "儲存中…"
    : m.sync === "error"
      ? "連線失敗，請重試"
      : m.sync === "loading"
        ? "載入中…"
        : m.mode === "demo"
          ? "示範模式 · 本機儲存"
          : "雲端已同步";
}
export function renderPage(m) {
  if (!m.mode) return login(m);
  return `<div class="shell"><aside class="sidebar"><div class="brand">${ico("book")}<div><strong>閱讀手帳</strong><div class="eyebrow">READING JOURNAL</div></div></div>${nav(m, "nav")}<div class="sidebar-foot"><span class="dot"></span>${syncLabel(m)}<br><span style="font-size:10px">READING JOURNAL / 02</span></div></aside><main class="main"><header class="topbar"><span class="mobile-brand">閱讀手帳</span><label class="search">${ico("search")}<input id="search" aria-label="搜尋書名、作者或題材" placeholder="搜尋書名、作者、題材" value="${esc(m.state.query)}">${m.state.query ? iconButton("clearSearch", "清除搜尋", "close") : ""}</label><span class="preview">${m.mode === "demo" ? "示範模式" : syncLabel(m)}</span><button class="btn primary" data-act="add" aria-label="新增書籍">${ico("plus")}<span class="add-label">新增書籍</span></button></header>${m.sync === "error" ? `<div class="error-banner" role="alert">載入失敗，${button("retry", "重新連線")}</div>` : ""}<div id="content">${m.state.page === "shelf" ? shelf(m) : m.state.page === "review" ? review(m) : settings(m)}</div></main></div>${nav(m, "bottom-nav")}`;
}
function login(m) {
  const step = m.loginStep;
  return `<main class="login-wrap"><div class="login-card"><div class="brand">${ico("book")}<strong>閱讀手帳</strong></div><span class="eyebrow">A ROOM FOR EVERY STORY</span><h1>把故事，<br>好好留下。</h1><p class="hint">你的書櫃、心得與閱讀日常。</p>${m.loginError ? `<p class="error-banner" role="alert">${esc(m.loginError)}</p>` : ""}${step === "checking" ? '<p style="margin:28px 0">正在確認帳號資料…</p>' : step === "link" ? `<div class="login-actions"><p class="hint">第一次使用這個 Google 帳號，請選擇：</p>${button("legacy", "連結原有書櫃 ID", "link")}${button("newShelf", "建立全新書櫃", "plus")}</div>` : step === "legacy" ? `<form id="loginForm"><label class="field"><span>書櫃 ID</span><input name="account" required minlength="3" autocomplete="username"></label><label class="field"><span>密碼</span><input name="password" type="password" required autocomplete="current-password"></label><button class="btn primary full" type="submit">登入／連結書櫃</button>${button("loginHome", "返回")}</form>` : `<div class="login-actions"><button class="btn primary" data-act="google">使用 Google 登入</button>${button("legacy", "使用原有書櫃 ID")}${button("demo", "先試用示範書櫃", "book")}</div>`}<p class="hint login-note">示範模式僅使用虛構書籍。<br>登入後會連接你原有的雲端書櫃。</p></div></main>`;
}
const input = (d, key, label, type = "text", attrs = "") =>
  `<label class="field"><span>${label}</span><input name="${key}" type="${type}" value="${esc(d[key] ?? "")}" ${attrs}></label>`;
const textarea = (d, key, label) =>
  `<label class="field"><span>${label}</span><textarea name="${key}">${esc(d[key] || "")}</textarea></label>`;
function footer(text) {
  return `<div class="form-footer"><button type="button" class="btn" data-act="back">取消</button><button class="btn primary" type="submit">${ico("check")}${text}</button></div>`;
}
function editForm(m, layer, b, d) {
  const edit = layer.type === "edit";
  return `<form id="bookForm" data-key="${layer.key}"><span class="eyebrow">A NEW CHAPTER</span><h2>${edit ? "編輯這本書" : "留下下一個故事"}</h2><p class="hint" style="margin-top:8px">先記下書名，其他細節可以慢慢補齊。</p>${input(d, "title", "書名（必填）", "text", "required")}${input(d, "author", "作者")}<div class="field"><span>分類</span><div class="tags">${d.category.map((t) => `<button type="button" class="chip" data-act="unselectCategory" data-value="${esc(t)}">${esc(t)}${ico("close")}</button>`).join("")}</div><button type="button" class="btn" data-act="pickCategories">${ico("plus")}選擇／新增分類</button></div><div class="form-grid">${input(d, "wordCount", "字數／頁數", "number", 'min="0" step="1"')}${input(d, b?.status === "finished" ? "finishDate" : b?.status === "dropped" ? "dropDate" : "addDate", b?.status === "finished" ? "完食日期" : b?.status === "dropped" ? "棄書日期" : "加入日期", "date")}</div>${textarea(d, "reviewUrl", "推薦連結／備註")}${b?.status === "dropped" ? textarea(d, "dropReason", "棄書理由") : ""}${textarea(d, "synopsis", "故事大綱")}<button type="button" class="btn" data-act="lookup">${ico("search")}自動查找書籍資料</button><p class="hint" style="margin-top:8px">依書名與作者查找，頁數沿用每頁 350 字估算；套用前會顯示找到的內容。</p>${footer(edit ? "儲存修改" : "存入書櫃")}</form>`;
}
function detail(b) {
  return `${status(b)}<a class="book-title detail-title" href="${esc(searchUrl(b.title, b.author))}" target="_blank" rel="noopener noreferrer" title="搜尋書名與作者">${esc(b.title)} ${ico("link")}</a><button class="meta-link detail-author" data-act="quickSearch" data-value="${esc(b.author || "佚名")}">${esc(b.author || "佚名")}</button><div class="tags">${tags(b)}</div><div class="detail-actions">${b.status === "reading" ? `${button("toggleReading", b.isReadingNow ? "取消正在閱讀" : "開始閱讀", "book", `data-id="${esc(b.id)}"`)}${button("finish", "完食", "check", `data-id="${esc(b.id)}"`)}${button("drop", "棄書", "close", `data-id="${esc(b.id)}"`)}` : button("reread", "恢復閱讀／重讀", "book", `data-id="${esc(b.id)}"`)}${iconButton("menu", "更多書籍操作", "more", b.id)}</div><div class="detail-grid"><div><span class="small-label">作品字數</span><p>${wordText(b)}</p></div><div><span class="small-label">加入書櫃</span><p>${esc(b.addDate || "未填日期")}</p></div></div>${b.reviewUrl ? `<section class="detail-section"><h2 class="section-title">推薦連結／備註</h2><div class="prose">${linkedText(b.reviewUrl)}</div></section>` : ""}<section class="detail-section"><h2 class="section-title">故事大綱</h2><p class="prose">${esc(b.synopsis || "還沒有留下大綱。")}</p></section>${b.status === "finished" ? `<section class="detail-section"><div class="section-heading"><h2 class="section-title">完食筆記 ${stars(b.rating)}</h2>${iconButton("finish", "修改完食紀錄", "edit", b.id)}</div><p class="hint">${esc(b.finishDate || "未填日期")}</p><div class="review prose">${esc(b.review || "尚未填寫心得。")}</div></section>` : ""}${b.status === "dropped" ? `<section class="detail-section"><div class="section-heading"><h2 class="section-title">棄書紀錄</h2>${iconButton("drop", "修改棄書紀錄", "edit", b.id)}</div><p class="hint">${esc(b.dropDate || "未填日期")} · 第 ${esc(b.dropChapter || "?")} 章</p><div class="review prose">${esc(b.dropReason || "尚未填寫原因")}</div></section>` : ""}`;
}
function recordForm(layer, b, d) {
  const finish = layer.type === "finish";
  return `<form id="recordForm" data-key="${layer.key}"><span class="eyebrow">${finish ? "THE LAST PAGE" : "UNTIL NEXT TIME"}</span><h2>${finish ? "記錄完食的心情" : "暫時停在這一頁"}</h2><p class="hint" style="margin:10px 0 20px">《${esc(b.title)}》</p>${input(d, "date", finish ? "完食日期" : "棄書日期", "date")}${
    finish
      ? `<div class="rating-stars" role="group" aria-label="星級評分">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-act="star" data-value="${n}" aria-label="${n} 星（左半可選半星）"><span class="star-base">${ico("star")}</span><span class="star-fill" style="width:${Math.max(0, Math.min(1, Number(d.rating) - n + 1)) * 100}%">${ico("star")}</span></button>`).join("")}</div><label class="field"><span>評分（可選半星）</span><select name="rating"><option value="0">暫不評分</option>${Array.from(
          { length: 10 },
          (_, i) => (i + 1) / 2,
        )
          .map(
            (n) =>
              `<option value="${n}" ${Number(d.rating) === n ? "selected" : ""}>${n} 星</option>`,
          )
          .join("")}</select></label>${textarea(d, "review", "讀後心得")}`
      : `${input(d, "chapter", "棄書章節")}${textarea(d, "dropReason", "棄書理由")}`
  }${footer("儲存閱讀紀錄")}</form>`;
}
function filterForm(m, layer) {
  const d = m.drafts[layer.key] || m.state,
    s = stats(m.books);
  return `<form id="filterForm" data-key="${layer.key}"><h2>找一本對的書</h2>${select(
    "year",
    "完食／棄書年度",
    [
      ["", "全部年度"],
      ...Object.keys(s.years)
        .sort()
        .reverse()
        .map((y) => [y, y + " 年"]),
    ],
    d.year,
  )}${select("rating", "評分", ratingOptions, d.rating)}${select("words", "字數", wordOptions, d.words)}${select("category", "分類", [["", "全部分類"], ...[...new Set(m.books.flatMap((b) => b.category || []))].map((c) => [c, c])], d.category)}${select(
    "sort",
    "排列方式",
    [
      ["default", "在讀、置頂、原有狀態日期順序"],
      ["title", "依書名排列"],
      ["rating", "評分由高至低"],
    ],
    d.sort,
  )}<div class="form-footer"><button type="button" class="btn" data-act="resetFilterForm">重設</button><button type="submit" class="btn primary">套用條件</button></div></form>`;
}
const select = (name, label, options, current) =>
  `<label class="field"><span>${label}</span><select name="${name}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(current) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
function categories(m, layer) {
  const d = m.drafts[layer.formKey],
    query = layer.query || "",
    cats = m.categories.filter((c) =>
      c.toLowerCase().includes(query.toLowerCase()),
    );
  return `<h2>${d ? "選擇故事的題材" : "分類管理"}</h2><label class="field"><span>搜尋或新增分類</span><input id="categorySearch" value="${esc(query)}" placeholder="輸入後按 Enter，可一次新增多個"></label><p class="hint">可用逗號、空白分隔。${d ? "點選分類後可繼續輸入。" : ""}</p><div class="category-options">${cats.map((c) => `<div class="category-item"><button data-act="${d ? "selectCategory" : "categorySearch"}" data-value="${esc(c)}" class="btn ${d?.category.includes(c) ? "selected" : ""}" ${d ? `aria-pressed="${d.category.includes(c)}"` : ""}>${esc(c)}</button>${iconButton("deleteCategory", `移除分類「${c}」`, "close", c)}</div>`).join("")}</div>${!cats.length ? '<p class="hint">沒有相符分類，可直接新增。</p>' : ""}<div class="form-footer">${button("addCategory", "新增輸入的分類", "plus")}<button class="btn primary" data-act="back">完成</button></div>`;
}
function menu(b) {
  const actions = [
    ["edit", "edit", "編輯基本資料"],
    ...(b.status === "reading"
      ? [
          [
            "toggleReading",
            "book",
            b.isReadingNow ? "取消正在閱讀" : "標記正在閱讀",
          ],
          ["finish", "check", "記錄完食"],
          ["drop", "close", "記錄棄書"],
        ]
      : [["reread", "book", "恢復閱讀／重讀"]]),
    ["pin", "pin", b.isPinned ? "取消置頂" : "置頂"],
    ["delete", "trash", "刪除書籍"],
  ];
  return `<h2 style="font-size:23px;margin-bottom:20px">${esc(b.title)}</h2>${actions.map(([a, i, t]) => `<button class="menu-item ${a === "delete" ? "danger" : ""}" data-act="${a}" data-id="${esc(b.id)}">${ico(i)}${t}</button>`).join("")}<a class="menu-item" href="${esc(searchUrl(b.title, b.author))}" target="_blank" rel="noopener noreferrer">${ico("link")}搜尋書名與作者</a>`;
}
export function renderLayer(m) {
  const l = m.state.layers.at(-1);
  if (!l) return "";
  const b = m.books.find((b) => b.id === l.id),
    d = m.drafts[l.key] || {};
  let title = "",
    body = "";
  if (l.type === "detail" && b) {
    title = "書籍詳情";
    body = detail(b);
  } else if (["add", "edit"].includes(l.type)) {
    title = l.type === "add" ? "新增書籍" : "編輯書籍";
    body = editForm(m, l, b, d);
  } else if (["finish", "drop"].includes(l.type) && b) {
    title = "閱讀紀錄";
    body = recordForm(l, b, d);
  } else if (l.type === "filter") {
    title = "篩選與排序";
    body = filterForm(m, l);
  } else if (l.type === "menu" && b) {
    title = "書籍操作";
    body = menu(b);
  } else if (l.type === "categories") {
    title = "題材分類";
    body = categories(m, l);
  } else if (l.type === "lookup") {
    title = "找到的書籍資料";
    body = `<h2>確認後套用</h2><p class="hint">作者：${esc(l.result.author || "未知")}<br>估算字數：${l.result.wordCount.toLocaleString()} 字</p><p class="prose review">${esc(l.result.synopsis || "沒有大綱")}</p><p class="hint">沿用原有規則：作者只補空白，字數與大綱會以此結果更新。</p><div class="form-footer">${button("back", "取消")}<button class="btn primary" data-act="applyLookup">套用到表單</button></div>`;
  } else if (l.type === "discard") {
    title = "尚未儲存";
    body = `<h2>要放棄這次編輯嗎？</h2><p class="hint" style="margin:18px 0">已輸入的內容尚未儲存。</p><div class="form-footer">${button("back", "繼續編輯")}<button class="btn primary" data-act="discard">放棄變更</button></div>`;
  } else if (l.type === "confirm") {
    title = "確認操作";
    body = `<h2>${esc(l.title)}</h2><p class="prose" style="margin:18px 0">${esc(l.message)}</p><div class="form-footer">${button("back", "取消")}<button class="btn primary" data-act="confirmAction">${esc(l.label || "確認")}</button></div>`;
  } else {
    title = "書籍已移除";
    body = `<p>這本書已不在書櫃中。</p>${button("back", "返回")}`;
  }
  return `<div class="overlay ${["filter", "menu", "finish", "drop", "confirm", "discard"].includes(l.type) ? "sheet" : ""}"><section class="panel" role="dialog" aria-modal="true" aria-labelledby="dialogTitle"><header class="panel-head"><span id="dialogTitle">${title}</span>${iconButton("back", "關閉" + title, "close")}</header>${body}</section></div>`;
}
