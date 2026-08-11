import type { SessionPlayer } from "@/lib/types";

const STORAGE_KEY = "doodle-dash-session-v1";

export interface PersistedSession extends SessionPlayer {
  sessionToken: string;
  joinedRoomId: string;
}

export function savePersistedSession(session: PersistedSession): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadPersistedSession(): PersistedSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
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
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
