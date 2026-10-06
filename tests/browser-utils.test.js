import test from "node:test";
import assert from "node:assert/strict";
import { androidBrowserIntentUrl } from "../src/browser-utils.js";

test("Android search links use a Chrome package intent", () => {
  const url = "https://www.google.com/search?q=%E7%9B%B2%E5%AB%81%20%E7%8B%82%E4%B8%8A%E5%8A%A0%E7%8B%82";
  assert.equal(
    androidBrowserIntentUrl(url, "Mozilla/5.0 (Linux; Android 15)"),
    "intent://www.google.com/search?q=%E7%9B%B2%E5%AB%81%20%E7%8B%82%E4%B8%8A%E5%8A%A0%E7%8B%82#Intent;scheme=https;package=com.android.chrome;component=com.android.chrome/com.google.android.apps.chrome.IntentDispatcher;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end",
  );
});

test("non-Android browsers keep the normal web link", () => {
  assert.equal(
    androidBrowserIntentUrl("https://www.google.com/search?q=book", "Mozilla/5.0 (iPhone)"),
    "",
  );
});
