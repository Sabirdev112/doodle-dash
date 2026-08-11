"use client";

import Image from "next/image";
import { getCharacter, getCharacterImage, parseAvatar } from "@/lib/avatars";

interface AvatarDisplayProps {
  avatar: string;
  className?: string;
  title?: string;
  animated?: boolean;
}

export default function AvatarDisplay({
  avatar,
  className = "",
  title,
  animated = true,
}: AvatarDisplayProps) {
  const characterId = parseAvatar(avatar);
  const character = getCharacter(characterId);
  const animClass = animated ? "avatar-character avatar-idle" : "avatar-character";

  return (
    <span
      className={`relative inline-flex items-end justify-center ${animClass} ${className}`.trim()}
      data-character={characterId}
    >
      <Image
        src={getCharacterImage(characterId)}
        alt={title ?? character.label}
        width={200}
        height={400}
        className="h-full w-full object-contain object-bottom"
        draggable={false}
        unoptimized
      />
    </span>
  );
}
