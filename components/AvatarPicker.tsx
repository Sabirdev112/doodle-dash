"use client";

import { AVATARS, type AvatarId } from "@/lib/types";

interface AvatarPickerProps {
  selected: AvatarId;
  onSelect: (avatar: AvatarId) => void;
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-8">
      {AVATARS.map((avatar, i) => (
        <button
          key={avatar}
          type="button"
          onClick={() => onSelect(avatar)}
          style={{ transform: `rotate(${i % 2 === 0 ? -2 : 2}deg)` }}
          className={`flex h-14 w-14 items-center justify-center rounded-lg border-2 bg-white transition hover:scale-105 sm:h-16 sm:w-16 ${
            selected === avatar
              ? "border-doodle-grape bg-doodle-yellow/40 shadow-sketch-sm"
              : "border-doodle-ink/40 hover:border-doodle-ink"
          }`}
        >
          <img
            src={`/avatars/${avatar}.svg`}
            alt={avatar}
            className="h-9 w-9 sm:h-10 sm:w-10"
          />
        </button>
      ))}
    </div>
  );
}
