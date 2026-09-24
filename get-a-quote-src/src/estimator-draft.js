// A tab-scoped draft. IndexedDB retains File objects; sessionStorage is the
// text-only fallback when browser storage is restricted. Never use analytics.
const KEY = "greenvac-estimator-v2";
const DAY = 24 * 60 * 60 * 1000;
let dbPromise;
let queue = Promise.resolve();

export function newReference() {
  return `GV-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
}

function database() {
  if (!dbPromise) dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("Draft storage unavailable"));
  });
  return dbPromise;
}

function transaction(db, mode, operation) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", mode);
    const request = operation(tx.objectStore("drafts"));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}

export async function loadDraft() {
  let fallback;
  try { fallback = JSON.parse(sessionStorage.getItem(KEY)); } catch { /* optional */ }
  const valid = fallback?.ans?.reference && Number.isFinite(fallback.updated) && Date.now() - fallback.updated <= DAY;
  try {
    const db = await database();
    // Remove old photos/drafts, including abandoned tabs, on each new visit.
    await new Promise((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      const cursor = tx.objectStore("drafts").openCursor();
      cursor.onsuccess = () => {
        const item = cursor.result;
        if (!item) return;
        if (Date.now() - item.value.updated > DAY) item.delete();
        item.continue();
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    if (!valid) return null;
    const saved = await transaction(db, "readonly", s => s.get(fallback.ans.reference));
    if (saved && saved.updated >= fallback.updated) return saved;
  } catch { /* Text still restores if photo storage is unavailable. */ }
  if (!valid) return null;
  return { ...fallback, photoRestoreFailed: Boolean(fallback.photoCount), ans: { ...fallback.ans, sitePhotos: [] } };
}

export function saveDraft(draft) {
  const data = { ...draft, updated: Date.now() };
  const { sitePhotos = [], ...text } = data.ans;
  let textSaved = false;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...data, ans: text, photoCount: sitePhotos.length }));
    textSaved = true;
  } catch { /* restricted storage */ }
  queue = queue.catch(() => {}).then(async () => {
    try {
      const db = await database();
      await transaction(db, "readwrite", s => s.put(data, data.ans.reference));
      return textSaved ? "saved" : "unavailable";
    } catch { return textSaved && !sitePhotos.length ? "saved" : "unavailable"; }
  });
  return queue;
}

export async function clearDraft(reference) {
  try { sessionStorage.removeItem(KEY); } catch { /* optional */ }
  await queue.catch(() => {});
  try {
    const db = await database();
    await transaction(db, "readwrite", s => s.delete(reference));
  } catch { /* optional */ }
}
