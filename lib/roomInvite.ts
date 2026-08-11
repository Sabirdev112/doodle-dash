export function isExpiredRoomError(error: string): boolean {
  return /not found|expired|no longer exists/i.test(error);
}

export async function checkRoomExists(roomId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `/api/room/status?roomId=${encodeURIComponent(roomId)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { exists?: boolean };
    return Boolean(data.exists);
  } catch {
    return false;
  }
}
