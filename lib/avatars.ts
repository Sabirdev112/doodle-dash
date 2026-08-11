import { AVATARS, type AvatarId } from "@/lib/types";

export const FACES = [...AVATARS] as const;
export type FaceId = (typeof FACES)[number];

export const OUTFITS = ["tee", "hoodie", "overalls", "dress", "suit", "jersey"] as const;
export type OutfitId = (typeof OUTFITS)[number];

export const HEADGEARS = ["none", "cap", "crown", "headphones", "bow", "party"] as const;
export type HeadgearId = (typeof HEADGEARS)[number];

export type AvatarCategory = "face" | "outfit" | "headgear";

export interface AvatarConfig {
  face: FaceId;
  outfit: OutfitId;
  headgear: HeadgearId;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  face: "cat",
  outfit: "tee",
  headgear: "none",
};

export const CATEGORY_OPTIONS: Record<AvatarCategory, readonly string[]> = {
  face: FACES,
  outfit: OUTFITS,
  headgear: HEADGEARS,
};

export const CATEGORY_LABELS: Record<AvatarCategory, string> = {
  face: "Face",
  outfit: "Outfit",
  headgear: "Head Gear",
};

const OUTFIT_SET = new Set<string>(OUTFITS);
const HEADGEAR_SET = new Set<string>(HEADGEARS);
const FACE_SET = new Set<string>(FACES);

export function encodeAvatar(config: AvatarConfig): string {
  return `${config.face}:${config.outfit}:${config.headgear}`;
}

export function parseAvatar(value: string | undefined | null): AvatarConfig {
  if (!value) return { ...DEFAULT_AVATAR };

  if (value.includes(":")) {
    const [face, outfit, headgear] = value.split(":");
    return {
      face: FACE_SET.has(face) ? (face as FaceId) : DEFAULT_AVATAR.face,
      outfit: OUTFIT_SET.has(outfit) ? (outfit as OutfitId) : DEFAULT_AVATAR.outfit,
      headgear: HEADGEAR_SET.has(headgear)
        ? (headgear as HeadgearId)
        : DEFAULT_AVATAR.headgear,
    };
  }

  if (FACE_SET.has(value)) {
    return { face: value as FaceId, outfit: "tee", headgear: "none" };
  }

  return { ...DEFAULT_AVATAR };
}

export function isValidAvatar(value: string): boolean {
  if (FACE_SET.has(value)) return true;
  const config = parseAvatar(value);
  return encodeAvatar(config) === value;
}

export function cycleAvatarPart(
  config: AvatarConfig,
  category: AvatarCategory,
  direction: 1 | -1
): AvatarConfig {
  const options = CATEGORY_OPTIONS[category];
  const current = config[category];
  const index = options.indexOf(current);
  const nextIndex = (index + direction + options.length) % options.length;
  return { ...config, [category]: options[nextIndex] } as AvatarConfig;
}

export function getCategoryLabel(category: AvatarCategory, config: AvatarConfig): string {
  const value = config[category];
  return value === "none" ? "None" : value.charAt(0).toUpperCase() + value.slice(1);
}

/** @deprecated Use encodeAvatar — kept for gradual migration */
export type { AvatarId };
