import { EnhancedNote } from "./geminiService";

export interface EnhancedNotebook extends EnhancedNote {
  id: string;
  createdAt: number;
}

const DB_NAME = "PhyleyNotesOfflineDB";
const STORE_NAME = "notebooks";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB failed to open");
      reject(new Error("Unable to initialize offline IndexedDB database."));
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveNotebook(note: EnhancedNote, id?: string): Promise<EnhancedNotebook> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);

    const notebook: EnhancedNotebook = {
      ...note,
      id: id || Date.now().toString(),
      createdAt: Date.now()
    };

    const request = store.put(notebook);

    request.onsuccess = () => {
      resolve(notebook);
    };

    request.onerror = () => {
      reject(new Error("Database transaction failed to save notebook."));
    };
  });
}

export async function getAllNotebooks(): Promise<EnhancedNotebook[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as EnhancedNotebook[];
      // Sort in descending order of creation (most recent first)
      resolve(results.sort((a, b) => b.createdAt - a.createdAt));
    };

    request.onerror = () => {
      reject(new Error("Database transaction failed to retrieve notebooks."));
    };
  });
}

export async function deleteNotebook(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error("Database transaction failed to delete notebook."));
    };
  });
}
