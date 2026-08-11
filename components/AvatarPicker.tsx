"use client";

import { CHARACTERS, parseAvatar } from "@/lib/avatars";
import AvatarDisplay from "@/components/AvatarDisplay";

interface AvatarPickerProps {
  value: string;
  onChange: (avatar: string) => void;
}

export default function AvatarPicker({ value, onChange }: AvatarPickerProps) {
  const selected = parseAvatar(value);
  const label = CHARACTERS.find((c) => c.id === selected)?.label ?? "Character";

  return (
    <div className="space-y-4">
      <div
        className="mx-auto flex h-40 w-40 items-center justify-center rounded-xl border-2 border-doodle-ink bg-transparent p-3 shadow-sketch-sm"
        style={{ transform: "rotate(1deg)" }}
      >
        <AvatarDisplay avatar={selected} className="h-full w-full" animated />
      </div>

      <p className="text-center font-sketch text-lg text-doodle-ink">{label}</p>

      <div className="grid grid-cols-5 gap-2">
        {CHARACTERS.map((character) => {
          const isSelected = character.id === selected;
          return (
            <button
              key={character.id}
              type="button"
              onClick={() => onChange(character.id)}
              aria-label={`Select ${character.label}`}
              aria-pressed={isSelected}
              title={character.label}
              className={`flex aspect-square items-center justify-center rounded-lg border-2 p-1.5 transition ${
                isSelected
                  ? "border-doodle-accent bg-paper-dark shadow-sketch-sm"
                  : "border-doodle-ink/30 bg-white hover:border-doodle-ink hover:bg-paper-dark"
              }`}
            >
              <AvatarDisplay
                avatar={character.id}
                className="h-full w-full"
                animated={false}
              />
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-doodle-muted">
        Tap a character or use the preview above
      </p>
    </div>
  );
}
