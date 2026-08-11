export const CHARACTERS = [
  { id: "beep", label: "Beep" },
  { id: "whiskers", label: "Mr. Whiskers" },
  { id: "zorg", label: "Zorg" },
  { id: "chaos", label: "Dr. Chaos" },
  { id: "explorer", label: "Explorer" },
  { id: "cool-cat", label: "Cool Cat" },
  { id: "sprout", label: "Sprout" },
  { id: "rocker", label: "Rocker" },
  { id: "intern", label: "Intern" },
  { id: "diva", label: "Diva" },
] as const;

export type CharacterId = (typeof CHARACTERS)[number]["id"];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id) as CharacterId[];

export const DEFAULT_CHARACTER: CharacterId = "beep";

/** Bump when character PNG assets change to bust browser / Next image cache. */
export const AVATAR_ASSET_VERSION = 3;

const CHARACTER_SET = new Set<string>(CHARACTER_IDS);

const LEGACY_FACE_MAP: Record<string, CharacterId> = {
  cat: "whiskers",
  dog: "explorer",
  fox: "cool-cat",
  owl: "chaos",
  panda: "sprout",
  robot: "beep",
  alien: "zorg",
  ghost: "sprout",
};

export function getCharacter(id: CharacterId) {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}

export function getCharacterImage(id: CharacterId): string {
  return `/avatars/characters/${id}.png?v=${AVATAR_ASSET_VERSION}`;
}

export function parseAvatar(value: string | undefined | null): CharacterId {
  if (value && CHARACTER_SET.has(value)) {
    return value as CharacterId;
  }
  if (value?.includes(":")) {
    return LEGACY_FACE_MAP[value.split(":")[0]] ?? DEFAULT_CHARACTER;
  }
  if (value && LEGACY_FACE_MAP[value]) {
    return LEGACY_FACE_MAP[value];
  }
  return DEFAULT_CHARACTER;
}

export function encodeAvatar(character: CharacterId): string {
  return character;
}

export function isValidAvatar(value: string): boolean {
  if (CHARACTER_SET.has(value)) return true;
  if (value.includes(":")) return true;
  return value in LEGACY_FACE_MAP;
}

export function cycleCharacter(
  current: CharacterId,
  direction: 1 | -1
): CharacterId {
  const index = CHARACTER_IDS.indexOf(current);
  const next =
    (index + direction + CHARACTER_IDS.length) % CHARACTER_IDS.length;
  return CHARACTER_IDS[next];
}

export type AvatarId = CharacterId;
export const DEFAULT_AVATAR = DEFAULT_CHARACTER;
