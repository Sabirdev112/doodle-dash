import type { SessionPlayer } from "@/lib/types";

const STORAGE_KEY = "doodle-dash-session-v1";

export interface PersistedSession extends SessionPlayer {
  sessionToken: string;
  joinedRoomId: string;
}

function readStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function savePersistedSession(session: PersistedSession): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadPersistedSession(): PersistedSession | null {
  const storage = readStorage();
  if (!storage) return null;

  try {
    if (typeof window !== "undefined") {
      const legacy = window.sessionStorage.getItem(STORAGE_KEY);
      if (legacy) {
        window.sessionStorage.removeItem(STORAGE_KEY);
        storage.setItem(STORAGE_KEY, legacy);
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedSession>;
    if (
      !parsed.id ||
      !parsed.name ||
      !parsed.avatar ||
      !parsed.sessionToken ||
      !parsed.joinedRoomId
    ) {
      return null;
    }
    return parsed as PersistedSession;
  } catch {
    return null;
  }
}

export function clearPersistedSession(): void {
  const storage = readStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
