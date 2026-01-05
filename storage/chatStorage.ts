// storage/chatStorage.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ChatRole = "seeker" | "worker";

export type ChatMessage = {
  id: string;
  threadId: string;
  from: "seeker" | "worker";
  text: string;
  createdAt: string; // ISO
};

export type ChatThread = {
  id: string;

  // Identidad (simple por ahora)
  seekerName: string;
  workerName: string;

  // (Opcional) para futuro: ids reales
  seekerId?: string;
  workerId?: string;

  // Resumen
  lastMessageText: string;
  lastMessageAt: string; // ISO

  // No leídos
  unreadByWorker: number;
  unreadBySeeker: number;

  createdAt: string; // ISO
  updatedAt: string; // ISO
};

/** ===== Keys ===== */
const KEY_THREADS = "chamba_chat_threads_v1";
const KEY_MSGS_PREFIX = "chamba_chat_msgs_v1:"; // + threadId

/** ===== Utils ===== */
function nowISO() {
  return new Date().toISOString();
}

function uid(prefix = "m") {
  // suficientemente único para local
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJSON(key: string, value: any) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

async function getAllThreads(): Promise<ChatThread[]> {
  const arr = await readJSON<ChatThread[]>(KEY_THREADS, []);
  return Array.isArray(arr) ? arr : [];
}

async function saveAllThreads(threads: ChatThread[]) {
  await writeJSON(KEY_THREADS, threads);
}

function msgsKey(threadId: string) {
  return `${KEY_MSGS_PREFIX}${threadId}`;
}

/** ===== Public API (Threads) ===== */

export async function getThreads(): Promise<ChatThread[]> {
  const threads = await getAllThreads();
  // más recientes arriba
  return threads.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
}

export async function getThread(threadId: string): Promise<ChatThread | null> {
  const threads = await getAllThreads();
  return threads.find((t) => t.id === threadId) ?? null;
}

/**
 * ✅ Seeker crea o reutiliza un thread con un worker.
 * Regla: el worker NO inicia conversaciones.
 *
 * Nota: por ahora identificamos por workerName (simple).
 * Luego lo cambiamos por workerId.
 */
export async function createOrGetThreadBySeeker(opts: {
  seekerName: string;
  workerName: string;
  seekerId?: string;
  workerId?: string;
}): Promise<ChatThread> {
  const threads = await getAllThreads();

  const existing = threads.find((t) => {
    if (opts.workerId && t.workerId) return t.workerId === opts.workerId && (t.seekerId ?? "") === (opts.seekerId ?? "");
    // fallback por nombres si no hay ids
    return t.workerName === opts.workerName && t.seekerName === opts.seekerName;
  });

  if (existing) return existing;

  const t = nowISO();
  const newThread: ChatThread = {
    id: uid("th"),
    seekerName: opts.seekerName || "Cliente",
    workerName: opts.workerName || "Trabajador",
    seekerId: opts.seekerId,
    workerId: opts.workerId,

    lastMessageText: "",
    lastMessageAt: t,

    unreadByWorker: 0,
    unreadBySeeker: 0,

    createdAt: t,
    updatedAt: t,
  };

  const next = [newThread, ...threads];
  await saveAllThreads(next);
  await writeJSON(msgsKey(newThread.id), [] as ChatMessage[]);
  return newThread;
}

/** ===== Public API (Messages) ===== */

export async function getMessages(threadId: string): Promise<ChatMessage[]> {
  const arr = await readJSON<ChatMessage[]>(msgsKey(threadId), []);
  const msgs = Array.isArray(arr) ? arr : [];
  // orden cronológico
  return msgs.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
}

/** Seeker envía (inicia o continúa). */
export async function seekerSendMessage(threadId: string, text: string) {
  const t = text.trim();
  if (!t) return;

  const threads = await getAllThreads();
  const th = threads.find((x) => x.id === threadId);
  if (!th) throw new Error("THREAD_NOT_FOUND");

  const msg: ChatMessage = {
    id: uid("m"),
    threadId,
    from: "seeker",
    text: t,
    createdAt: nowISO(),
  };

  const msgs = await getMessages(threadId);
  const nextMsgs = [...msgs, msg];
  await writeJSON(msgsKey(threadId), nextMsgs);

  // update thread summary + unread
  th.lastMessageText = t;
  th.lastMessageAt = msg.createdAt;
  th.updatedAt = nowISO();
  th.unreadByWorker = (th.unreadByWorker || 0) + 1;

  await saveAllThreads(threads);
}

/**
 * ✅ Worker SOLO responde (no crea threads).
 * Si no existe thread -> error.
 */
export async function workerSendMessage(threadId: string, text: string) {
  const t = text.trim();
  if (!t) return;

  const threads = await getAllThreads();
  const th = threads.find((x) => x.id === threadId);
  if (!th) throw new Error("THREAD_NOT_FOUND");

  const msg: ChatMessage = {
    id: uid("m"),
    threadId,
    from: "worker",
    text: t,
    createdAt: nowISO(),
  };

  const msgs = await getMessages(threadId);
  const nextMsgs = [...msgs, msg];
  await writeJSON(msgsKey(threadId), nextMsgs);

  // update thread summary + unread
  th.lastMessageText = t;
  th.lastMessageAt = msg.createdAt;
  th.updatedAt = nowISO();
  th.unreadBySeeker = (th.unreadBySeeker || 0) + 1;

  await saveAllThreads(threads);
}

/** ===== Read state ===== */

export async function markThreadReadByWorker(threadId: string) {
  const threads = await getAllThreads();
  const th = threads.find((x) => x.id === threadId);
  if (!th) return;

  th.unreadByWorker = 0;
  th.updatedAt = nowISO();

  await saveAllThreads(threads);
}

export async function markThreadReadBySeeker(threadId: string) {
  const threads = await getAllThreads();
  const th = threads.find((x) => x.id === threadId);
  if (!th) return;

  th.unreadBySeeker = 0;
  th.updatedAt = nowISO();

  await saveAllThreads(threads);
}

/** ===== Admin / Debug ===== */

export async function resetChat() {
  const threads = await getAllThreads();
  await AsyncStorage.removeItem(KEY_THREADS);
  for (const t of threads) {
    await AsyncStorage.removeItem(msgsKey(t.id));
  }
}
