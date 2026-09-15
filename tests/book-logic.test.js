import test from "node:test";
import assert from "node:assert/strict";
import {
  filterBooks,
  sortBooks,
  stats,
  searchUrl,
  finishPatch,
  dropPatch,
  rereadPatch,
  normalizeBook,
  listText,
} from "../src/book-logic.js";
import { defaultState } from "../src/router.js";
import { createDemoRepository, DEMO_KEY } from "../src/repository.js";

test("原未讀集合包含在讀；新增在讀篩選不改變原集合", () => {
  const books = [
    { id: "a", status: "reading", isReadingNow: true },
    { id: "b", status: "reading" },
    { id: "c", status: "finished" },
  ];
  assert.equal(
    filterBooks(books, { ...defaultState(), status: "reading" }).length,
    2,
  );
  assert.equal(
    filterBooks(books, { ...defaultState(), status: "now" }).length,
    1,
  );
});
test("字數四區間維持原邊界及未知字數處理", () => {
  const books = [0, 299999, 300000, 499999, 500000, 999999, 1000000].map(
    (n) => ({ title: String(n), wordCount: n }),
  );
  for (const [words, expected] of [
    ["under30", [0, 299999]],
    ["30to50", [300000, 499999]],
    ["50to100", [500000, 999999]],
    ["over100", [1000000]],
  ])
    assert.deepEqual(
      filterBooks(books, { ...defaultState(), words }).map((b) => b.wordCount),
      expected,
    );
});
test("多關鍵字可跨書名、作者和分類，全部條件都要成立", () => {
  const b = {
    title: "長安小食記",
    author: "林間客",
    category: ["古代", "種田"],
  };
  assert.equal(
    filterBooks([b], { ...defaultState(), query: "長安 林間 種田" }).length,
    1,
  );
  assert.equal(
    filterBooks([b], { ...defaultState(), query: "長安 末世" }).length,
    0,
  );
});
test("排序依在讀、置頂、狀態日期、createdAt，不改原陣列", () => {
  const books = [
    { id: "old", addDate: "2025/1/2" },
    {
      id: "finished",
      status: "finished",
      finishDate: "2026/9/3",
      addDate: "2020-01-01",
    },
    { id: "pin", isPinned: true, addDate: "2000-01-01" },
    { id: "now", isReadingNow: true, addDate: "1990-01-01" },
    { id: "drop", status: "dropped", dropDate: "2026-09-04" },
  ];
  assert.deepEqual(
    sortBooks(books).map((b) => b.id),
    ["now", "pin", "drop", "finished", "old"],
  );
  assert.equal(books[0].id, "old");
});
test("年度使用完食和棄書日期，沒有日期不被推入當年", () => {
  const b = [
    { status: "finished", finishDate: "2026-09-01" },
    { status: "dropped", dropDate: "2026/09/02" },
    { status: "finished" },
    { status: "reading", addDate: "2026-01-01" },
  ];
  assert.deepEqual(stats(b).years, { 2026: { finished: 1, dropped: 1 } });
  assert.equal(filterBooks(b, { ...defaultState(), year: "2026" }).length, 2);
});
test("書名搜尋包含作者且編碼特殊字元，作者空白沒有 undefined", () => {
  assert.equal(
    new URL(searchUrl("A&B #1", "作者")).searchParams.get("q"),
    "A&B #1 作者",
  );
  assert.equal(new URL(searchUrl("書名")).searchParams.get("q"), "書名");
});
test("完食與棄書維持取消置頂和在讀，半星與理由保留", () => {
  assert.deepEqual(
    finishPatch({ date: "2026-09-15", rating: "4.5", review: "心得" }),
    {
      status: "finished",
      finishDate: "2026-09-15",
      rating: 4.5,
      review: "心得",
      isPinned: false,
      isReadingNow: false,
    },
  );
  assert.deepEqual(
    dropPatch({ date: "2026-09-15", chapter: "72", dropReason: "節奏" }),
    {
      status: "dropped",
      dropDate: "2026-09-15",
      dropChapter: "72",
      dropReason: "節奏",
      isPinned: false,
      isReadingNow: false,
    },
  );
});
test("重讀沿用原清除欄位，不更動書名、分類和置頂", () => {
  const p = rereadPatch();
  for (const k of [
    "finishDate",
    "dropChapter",
    "dropDate",
    "rating",
    "review",
    "dropReason",
  ])
    assert.equal(p[k], null);
  assert.equal(p.status, "reading");
  assert.ok(!("isPinned" in p));
  assert.ok(!("title" in p));
});
test("編輯完食日期與棄書日期不會遺失原其他欄位", () => {
  const old = {
    id: "x",
    status: "finished",
    createdAt: { seconds: 1 },
    review: "保留心得",
  };
  const p = normalizeBook(
    {
      title: " 書 ",
      category: ["古代", "古代"],
      finishDate: "2026-09-15",
      reviewUrl: "文字\nhttps://example.com",
    },
    old,
  );
  assert.equal(p.finishDate, "2026-09-15");
  assert.equal(p.title, "書");
  assert.deepEqual(p.category, ["古代"]);
  assert.equal({ ...old, ...p }.review, "保留心得");
  assert.equal({ ...old, ...p }.id, "x");
});
test("複製書單保留順序與原文字格式", () =>
  assert.equal(
    listText([{ title: "甲", author: "作者" }, { title: "乙" }]),
    "《甲》作者\n《乙》佚名",
  ));
test("示範操作只存獨立 key；重設不觸碰正式登入記憶", async () => {
  const map = new Map([
    ["reading_tracker_id", "original"],
    ["reading_tracker_pw", "untouched"],
  ]);
  const storage = {
    getItem: (k) => map.get(k),
    setItem: (k, v) => map.set(k, v),
  };
  const repo = createDemoRepository(storage);
  let data;
  repo.subscribe((v) => (data = v));
  const id = await repo.add({ title: "測試", category: ["小說"] });
  assert.equal(data.books.length, 9);
  await repo.update(id, { review: "測試" });
  assert.equal(data.books.find((b) => b.id === id).review, "測試");
  await repo.reset();
  assert.equal(data.books.length, 8);
  assert.equal(map.get("reading_tracker_id"), "original");
  assert.equal(map.get("reading_tracker_pw"), "untouched");
  assert.deepEqual(
    [...map.keys()],
    ["reading_tracker_id", "reading_tracker_pw", DEMO_KEY],
  );
});
test("本機儲存失敗不提交虛假的成功更新", async () => {
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw Error("quota");
    },
  };
  const repo = createDemoRepository(storage);
  let data;
  repo.subscribe((v) => (data = v));
  await assert.rejects(() => repo.add({ title: "失敗" }), /quota/);
  assert.equal(data.books.length, 8);
});
