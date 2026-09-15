import test from "node:test";
import assert from "node:assert/strict";
import { renderLayer } from "../src/views.js";

const model = {
  state: { layers: [{ key: "detail-1", type: "detail", id: "book-1" }] },
  books: [
    {
      id: "book-1",
      title: "測試書籍",
      author: "測試作者",
      status: "reading",
      category: [],
      addDate: "2026-09-15",
    },
  ],
  drafts: {},
};

test("同一詳情層重繪時不重播進場動畫", () => {
  assert.match(renderLayer(model, false), /class="panel no-enter"/);
  assert.doesNotMatch(renderLayer(model, true), /class="panel no-enter"/);
});
