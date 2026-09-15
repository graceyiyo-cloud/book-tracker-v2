// LAN HTTP previews do not expose crypto.randomUUID in every mobile browser.
// These identifiers are only used for UI history and local demo book records.
export function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export async function copyText(text) {
  if (globalThis.navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Use the user-initiated selection fallback on HTTP or restricted frames.
    }
  }
  const active = document.activeElement;
  const input = document.createElement("textarea");
  input.value = text;
  input.style.cssText = "position:fixed;left:-9999px;top:0";
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand("copy");
  input.remove();
  active?.focus({ preventScroll: true });
  if (!copied) throw new Error("瀏覽器未允許複製");
}
