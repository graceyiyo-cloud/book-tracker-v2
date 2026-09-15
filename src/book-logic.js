export const DEFAULT_CATEGORIES = [
  "玄幻",
  "奇幻",
  "武俠",
  "仙俠",
  "都市",
  "言情",
  "古代",
  "架空",
  "科幻",
  "懸疑",
  "推理",
  "驚悚",
  "耽美",
  "百合",
  "穿越",
  "重生",
  "系統",
  "末世",
  "種田",
];
export const APP_ID = "my-reading-app";
export const labels = {
  all: "全部",
  reading: "未讀",
  now: "在讀",
  finished: "完食",
  dropped: "棄書",
};
export const wordOptions = [
  ["all", "全部字數"],
  ["under30", "30 萬字內"],
  ["30to50", "30–50 萬字"],
  ["50to100", "50–100 萬字"],
  ["over100", "100 萬字以上"],
];
export const ratingOptions = [
  ["0", "全部評分"],
  ["4.5", "4.5 星以上"],
  ["4", "4 星以上"],
  ["3", "3 星以上"],
];
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const kind = (b) =>
  b.status === "reading" ? (b.isReadingNow ? "now" : "reading") : b.status;
export const dateValue = (b) =>
  b.status === "finished"
    ? b.finishDate || b.addDate
    : b.status === "dropped"
      ? b.dropDate || b.addDate
      : b.addDate;
export function dateNumber(value) {
  const n = typeof value === "string" ? value.match(/\d+/g) : null;
  return n
    ? Number(n[0]) * 10000 + Number(n[1] || 0) * 100 + Number(n[2] || 0)
    : 0;
}
export function sortBooks(list) {
  return [...list].sort(
    (a, b) =>
      Number(!!b.isReadingNow) - Number(!!a.isReadingNow) ||
      Number(!!b.isPinned) - Number(!!a.isPinned) ||
      dateNumber(dateValue(b)) - dateNumber(dateValue(a)) ||
      (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
  );
}
export function filterBooks(books, f) {
  const terms = (f.query || "").toLowerCase().split(/\s+/).filter(Boolean);
  let list = sortBooks(books).filter((b) => {
    const wc = Number(b.wordCount) || 0;
    const termsMatch = terms.every((t) =>
      [b.title || "", b.author || "", ...(b.category || [])].some((v) =>
        String(v).toLowerCase().includes(t),
      ),
    );
    const date =
      b.status === "finished"
        ? b.finishDate
        : b.status === "dropped"
          ? b.dropDate
          : null;
    return (
      (f.status === "all" ||
        (f.status === "now"
          ? b.status === "reading" && b.isReadingNow
          : b.status === f.status)) &&
      termsMatch &&
      (!f.category || (b.category || []).includes(f.category)) &&
      (!Number(f.rating) || (b.rating || 0) >= Number(f.rating)) &&
      (!f.year || (!!date && date.startsWith(f.year))) &&
      (f.words === "all" ||
        (f.words === "under30" && wc < 300000) ||
        (f.words === "30to50" && wc >= 300000 && wc < 500000) ||
        (f.words === "50to100" && wc >= 500000 && wc < 1000000) ||
        (f.words === "over100" && wc >= 1000000))
    );
  });
  if (f.sort === "title")
    list.sort((a, b) => a.title.localeCompare(b.title, "zh-Hant"));
  if (f.sort === "rating")
    list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  return list;
}
export function stats(books) {
  const result = { reading: 0, now: 0, finished: 0, dropped: 0, years: {} };
  for (const b of books) {
    if (b.status === "reading") {
      result.reading++;
      if (b.isReadingNow) result.now++;
    } else if (["finished", "dropped"].includes(b.status)) {
      result[b.status]++;
      const date = b.status === "finished" ? b.finishDate : b.dropDate;
      const y = date?.split(/[-/]/)[0];
      if (y?.length === 4) {
        result.years[y] ??= { finished: 0, dropped: 0 };
        result.years[y][b.status]++;
      }
    }
  }
  return result;
}
export const searchUrl = (title, author) =>
  "https://www.google.com/search?q=" +
  encodeURIComponent(author ? `${title} ${author}` : title);
export const wordText = (b) =>
  b.wordCount ? `${Number(b.wordCount).toLocaleString()} 字` : "字數未知";
export const finishPatch = (d) => ({
  status: "finished",
  finishDate: d.date,
  rating: Number(d.rating) || 0,
  review: d.review || "",
  isPinned: false,
  isReadingNow: false,
});
export const dropPatch = (d) => ({
  status: "dropped",
  dropDate: d.date,
  dropChapter: d.chapter || "",
  dropReason: d.dropReason || "",
  isPinned: false,
  isReadingNow: false,
});
export const rereadPatch = () => ({
  status: "reading",
  finishDate: null,
  dropChapter: null,
  dropDate: null,
  rating: null,
  review: null,
  dropReason: null,
  isReadingNow: false,
});
export const listText = (books) =>
  books.map((b) => `《${b.title}》${b.author || "佚名"}`).join("\n");
export function normalizeBook(data, old = {}) {
  const result = {
    title: String(data.title || "").trim(),
    author: String(data.author || "").trim(),
    category: [...new Set(data.category || [])],
    wordCount: data.wordCount === "" ? "" : Number(data.wordCount) || 0,
    isWordCountManual: !!data.isWordCountManual,
    addDate: data.addDate || "",
    reviewUrl: data.reviewUrl || "",
    synopsis: data.synopsis || "",
  };
  if (old.status === "finished") result.finishDate = data.finishDate || "";
  if (old.status === "dropped") {
    result.dropDate = data.dropDate || "";
    result.dropReason = data.dropReason || "";
  }
  return result;
}
