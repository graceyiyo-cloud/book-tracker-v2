import { DEFAULT_CATEGORIES, APP_ID } from "./book-logic.js";
import { demoBooks } from "./demo-data.js";
export const DEMO_KEY = "reading-journal-v2-demo";
export function createDemoRepository(storage) {
  let data = {
    books: structuredClone(demoBooks),
    categories: [...DEFAULT_CATEGORIES],
  };
  try {
    const saved = JSON.parse(storage.getItem(DEMO_KEY));
    if (saved && Array.isArray(saved.books) && Array.isArray(saved.categories))
      data = saved;
  } catch {}
  let listener = () => {};
  const emit = () => listener(structuredClone(data));
  const commit = (next) => {
    storage.setItem(DEMO_KEY, JSON.stringify(next));
    data = next;
    emit();
  };
  return {
    mode: "demo",
    subscribe(fn) {
      listener = fn;
      emit();
      return () => (listener = () => {});
    },
    async add(book) {
      const id = globalThis.crypto?.randomUUID?.() || "book-" + Date.now();
      commit({
        ...data,
        books: [
          ...data.books,
          {
            ...book,
            id,
            status: "reading",
            createdAt: { seconds: Date.now() / 1000 },
          },
        ],
      });
      return id;
    },
    async update(id, patch) {
      commit({
        ...data,
        books: data.books.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      });
    },
    async remove(id) {
      commit({ ...data, books: data.books.filter((b) => b.id !== id) });
    },
    async categories(categories) {
      commit({ ...data, categories });
    },
    async reset() {
      commit({
        books: structuredClone(demoBooks),
        categories: [...DEFAULT_CATEGORIES],
      });
    },
  };
}
export async function loadCloud() {
  const [appSdk, authSdk, dbSdk] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js"),
  ]);
  let config = {
    apiKey: "AIzaSyDX1-Lwc5_u_fwV9P25xh32dVF8uVNT0QU",
    authDomain: "my-reading-tracker-58f69.firebaseapp.com",
    projectId: "my-reading-tracker-58f69",
    storageBucket: "my-reading-tracker-58f69.firebasestorage.app",
    messagingSenderId: "370802674969",
    appId: "1:370802674969:web:efb1c045e0028925154988",
    measurementId: "G-52EWLNG7ST",
  };
  if (globalThis.__firebase_config) {
    try {
      config = JSON.parse(globalThis.__firebase_config);
    } catch {}
  }
  const app = appSdk.getApps().length
    ? appSdk.getApp()
    : appSdk.initializeApp(config);
  const auth = authSdk.getAuth(app),
    db = dbSdk.getFirestore(app),
    appId = globalThis.__app_id || APP_ID;
  await auth.authStateReady();
  const base = ["artifacts", appId, "public", "data"];
  const mappingRef = () =>
    dbSdk.doc(db, ...base, "google_users", auth.currentUser.uid);
  const settingsRef = (id) =>
    dbSdk.doc(db, ...base, `reading_list_${id}`, "settings");
  async function ensureAuth() {
    if (auth.currentUser) return;
    if (globalThis.__initial_auth_token)
      await authSdk.signInWithCustomToken(
        auth,
        globalThis.__initial_auth_token,
      );
    else await authSdk.signInAnonymously(auth);
  }
  return {
    async restore() {
      if (auth.currentUser && !auth.currentUser.isAnonymous) {
        const snap = await dbSdk.getDoc(mappingRef());
        return snap.exists() && snap.data().mappedId
          ? { id: snap.data().mappedId }
          : { needsLink: true };
      }
      const id = localStorage.getItem("reading_tracker_id"),
        password = localStorage.getItem("reading_tracker_pw");
      if (id && password) {
        await ensureAuth();
        const s = await dbSdk.getDoc(settingsRef(id));
        if (s.exists() && s.data().password === password) return { id };
      }
      return null;
    },
    async google() {
      await authSdk.signInWithPopup(auth, new authSdk.GoogleAuthProvider());
      const s = await dbSdk.getDoc(mappingRef());
      return s.exists() && s.data().mappedId
        ? { id: s.data().mappedId }
        : { needsLink: true };
    },
    async newShelf() {
      if (!auth.currentUser || auth.currentUser.isAnonymous)
        throw Error("請先使用 Google 登入");
      const id = auth.currentUser.uid;
      await dbSdk.setDoc(mappingRef(), { mappedId: id });
      return { id };
    },
    async legacy(id, password) {
      id = id.trim();
      password = password.trim();
      if (id.length < 3) throw Error("書櫃 ID 至少需要 3 個字元");
      if (!password) throw Error("請輸入密碼");
      await ensureAuth();
      const ref = settingsRef(id),
        s = await dbSdk.getDoc(ref);
      if (s.exists() && s.data().password) {
        if (s.data().password !== password) throw Error("密碼錯誤");
      } else await dbSdk.setDoc(ref, { password }, { merge: true });
      if (!auth.currentUser.isAnonymous)
        await dbSdk.setDoc(mappingRef(), { mappedId: id });
      localStorage.setItem("reading_tracker_id", id);
      localStorage.setItem("reading_tracker_pw", password);
      return { id };
    },
    async logout() {
      await authSdk.signOut(auth);
      localStorage.removeItem("reading_tracker_id");
      localStorage.removeItem("reading_tracker_pw");
    },
    repository(id) {
      const col = dbSdk.collection(db, ...base, `reading_list_${id}`);
      return {
        mode: "cloud",
        subscribe(fn, onError) {
          return dbSdk.onSnapshot(
            col,
            (s) => {
              const books = [];
              let categories = [...DEFAULT_CATEGORIES];
              for (const d of s.docs) {
                if (d.id === "settings") {
                  if (Array.isArray(d.data().categories))
                    categories = d.data().categories;
                } else books.push({ ...d.data(), id: d.id });
              }
              fn({ books, categories });
            },
            onError,
          );
        },
        async add(book) {
          return (
            await dbSdk.addDoc(col, {
              ...book,
              status: "reading",
              createdAt: dbSdk.serverTimestamp(),
            })
          ).id;
        },
        async update(bookId, patch) {
          await dbSdk.updateDoc(dbSdk.doc(col, bookId), patch);
        },
        async remove(bookId) {
          await dbSdk.deleteDoc(dbSdk.doc(col, bookId));
        },
        async categories(categories) {
          await dbSdk.setDoc(settingsRef(id), { categories }, { merge: true });
        },
      };
    },
  };
}
export async function lookupBook(title, author) {
  const q = `intitle:${title}${author ? `+inauthor:${author}` : ""}`;
  const response = await fetch(
    "https://www.googleapis.com/books/v1/volumes?q=" +
      encodeURIComponent(q) +
      "&maxResults=1",
  );
  if (!response.ok) throw Error("查找服務暫時無法使用，請稍後再試");
  const json = await response.json();
  const info = json.items?.[0]?.volumeInfo;
  if (!info) throw Error("沒有找到這本書的資料");
  return {
    author: info.authors?.[0] || "",
    wordCount: (info.pageCount || 0) * 350,
    synopsis: info.description || "",
  };
}
