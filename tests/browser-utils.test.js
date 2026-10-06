import test from "node:test";
import assert from "node:assert/strict";
import { androidBrowserIntentUrl } from "../src/browser-utils.js";

test("Android search links use Chrome's external navigation scheme", () => {
  const url = "https://www.google.com/search?q=%E7%9B%B2%E5%AB%81%20%E7%8B%82%E4%B8%8A%E5%8A%A0%E7%8B%82";
  assert.equal(
    androidBrowserIntentUrl(url, "Mozilla/5.0 (Linux; Android 15)"),
    "googlechrome://navigate?url=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3D%25E7%259B%25B2%25E5%25AB%2581%2520%25E7%258B%2582%25E4%25B8%258A%25E5%258A%25A0%25E7%258B%2582",
  );
});

test("non-Android browsers keep the normal web link", () => {
  assert.equal(
    androidBrowserIntentUrl("https://www.google.com/search?q=book", "Mozilla/5.0 (iPhone)"),
    "",
  );
});
