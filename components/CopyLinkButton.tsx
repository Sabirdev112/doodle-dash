"use client";

import { useState } from "react";

interface CopyLinkButtonProps {
  url: string;
  label?: string;
  copiedLabel?: string;
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
  disabledHint?: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export default function CopyLinkButton({
  url,
  label = "Copy invite link",
  copiedLabel = "Copied!",
  variant = "primary",
  className = "",
  disabled = false,
  disabledHint,
}: CopyLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    if (disabled || !url) return;
    setFailed(false);
    const ok = await copyText(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } else {
      setFailed(true);
      setTimeout(() => setFailed(false), 3000);
    }
  };

  const btnClass =
    variant === "primary" ? "doodle-btn-mint w-full" : "doodle-btn-secondary w-full";

  return (
    <div>
      <button
        type="button"
        onClick={copy}
        disabled={disabled || !url}
        className={`${btnClass} ${className} ${
          disabled || !url ? "cursor-not-allowed opacity-40" : "cursor-pointer"
        }`}
      >
        <span aria-hidden>{copied ? "✓" : "🔗"}</span>
        {copied ? copiedLabel : failed ? "Copy failed — select URL below" : label}
      </button>
      {disabled && disabledHint && (
        <p className="mt-2 text-center text-xs text-doodle-muted">{disabledHint}</p>
      )}
    </div>
  );
}
