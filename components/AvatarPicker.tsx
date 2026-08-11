"use client";

import { useState } from "react";
import {
  CATEGORY_LABELS,
  cycleAvatarPart,
  encodeAvatar,
  getCategoryLabel,
  parseAvatar,
  type AvatarCategory,
  type AvatarConfig,
} from "@/lib/avatars";
import AvatarDisplay from "@/components/AvatarDisplay";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

const CATEGORIES: { id: AvatarCategory; icon: string }[] = [
  { id: "face", icon: "😊" },
  { id: "outfit", icon: "👕" },
  { id: "headgear", icon: "🎩" },
];

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const config = parseAvatar(value);
  const [activeCategory, setActiveCategory] = useState<AvatarCategory>("face");

  const setConfig = (next: AvatarConfig) => {
    onChange(encodeAvatar(next));
  };

  const cycle = (direction: 1 | -1) => {
    setConfig(cycleAvatarPart(config, activeCategory, direction));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2.5">
        {CATEGORIES.map(({ id, icon }, i) => {
          const isActive = activeCategory === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveCategory(id)}
              style={{ transform: `rotate(${i % 2 === 0 ? -1.5 : 1.5}deg)` }}
              className={`flex flex-col items-center gap-1 rounded-lg border-2 px-2 py-3 transition hover:scale-[1.02] ${
                isActive
                  ? "border-doodle-grape bg-doodle-yellow/40 shadow-sketch-sm"
                  : "border-doodle-ink/40 bg-white hover:border-doodle-ink"
              }`}
            >
              <span className="text-xl leading-none" aria-hidden>
                {icon}
              </span>
              <span className="font-sketch text-sm leading-tight text-doodle-ink">
                {CATEGORY_LABELS[id]}
              </span>
              <span className="text-[10px] capitalize text-doodle-muted">
                {getCategoryLabel(id, config)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => cycle(-1)}
          aria-label={`Previous ${CATEGORY_LABELS[activeCategory].toLowerCase()}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-doodle-ink bg-white text-xl shadow-sketch-sm transition hover:bg-paper-dark active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          ←
        </button>

        <div
          className="flex h-32 w-28 items-end justify-center overflow-hidden rounded-xl border-2 border-doodle-ink bg-gradient-to-b from-doodle-sky/15 to-white shadow-sketch-sm"
          style={{ transform: "rotate(1deg)" }}
        >
          <AvatarDisplay
            avatar={encodeAvatar(config)}
            className="h-28 w-auto drop-shadow-sm"
            animated
          />
        </div>

        <button
          type="button"
          onClick={() => cycle(1)}
          aria-label={`Next ${CATEGORY_LABELS[activeCategory].toLowerCase()}`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-doodle-ink bg-white text-xl shadow-sketch-sm transition hover:bg-paper-dark active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          →
        </button>
      </div>

      <p className="text-center text-xs text-doodle-muted">
        Use arrows to change your {CATEGORY_LABELS[activeCategory].toLowerCase()}
      </p>
    </div>
  );
}
