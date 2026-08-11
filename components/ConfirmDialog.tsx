"use client";

import ButtonSpinner from "./ButtonSpinner";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  variant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Yes",
  cancelLabel = "Cancel",
  busy = false,
  variant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-doodle-ink/40 backdrop-blur-[2px]"
        aria-label="Close dialog"
        onClick={onCancel}
        disabled={busy}
      />
      <div className="comic-overlay-enter relative z-10 w-full max-w-md doodle-card p-6 wobble-left">
        <h2
          id="confirm-dialog-title"
          className="font-sketch text-2xl text-doodle-ink"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-doodle-muted">
          {message}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="doodle-btn-secondary"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              variant === "danger" ? "doodle-btn-coral" : "doodle-btn-primary"
            }
          >
            {busy ? (
              <>
                <ButtonSpinner />
                Working…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
