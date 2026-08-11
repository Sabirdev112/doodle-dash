"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ButtonSpinner from "./ButtonSpinner";
import ConfirmDialog from "./ConfirmDialog";
import { leaveSession } from "@/lib/store";

interface LeaveRoomButtonProps {
  className?: string;
  variant?: "secondary" | "ghost";
}

export default function LeaveRoomButton({
  className = "",
  variant = "secondary",
}: LeaveRoomButtonProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    await leaveSession();
    router.push("/");
  };

  const base =
    variant === "ghost"
      ? "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-doodle-ink/25 bg-white/80 px-3 py-1.5 font-sketch text-sm text-doodle-muted transition hover:border-doodle-coral hover:text-doodle-coral disabled:opacity-50"
      : `doodle-btn-secondary ${className}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={leaving}
        className={base}
      >
        {leaving ? (
          <>
            <ButtonSpinner className="h-3.5 w-3.5" />
            Leaving…
          </>
        ) : (
          "Leave room"
        )}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title="Leave room?"
        message="You'll need to pick a new name and avatar to play again."
        confirmLabel="Leave"
        variant="danger"
        busy={leaving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void handleLeave()}
      />
    </>
  );
}
