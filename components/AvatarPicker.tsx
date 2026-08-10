"use client";

import { AVATARS, type AvatarId } from "@/lib/types";

interface AvatarPickerProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
      {AVATARS.map((avatar) => (
        <button
          key={avatar}
          type="button"
          onClick={() => onSelect(avatar)}
          className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 bg-slate-800 transition hover:scale-105 ${
            selected === avatar
              ? "border-brand-400 ring-2 ring-brand-400/50"
              : "border-slate-700 hover:border-slate-500"
          }`}
        >
          <img
            src={`/avatars/${avatar}.svg`}
            alt={avatar}
            className="h-10 w-10"
          />
        </button>
      ))}
    </div>
  );
}
