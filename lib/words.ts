/** Built-in word bank — used when the host leaves custom words empty. */
export const DEFAULT_WORDS = [
  "apple", "banana", "car", "house", "tree", "sun", "moon", "star",
  "cat", "dog", "fish", "bird", "flower", "mountain", "river", "ocean",
  "pizza", "cake", "book", "phone", "computer", "guitar", "piano", "drum",
  "rainbow", "cloud", "snow", "fire", "water", "earth", "rocket", "planet",
  "castle", "dragon", "wizard", "pirate", "treasure", "island", "bridge", "train",
  "bicycle", "airplane", "helicopter", "submarine", "camera", "television", "clock", "lamp",
  "chair", "table", "window", "door", "garden", "forest", "desert", "volcano",
  "elephant", "giraffe", "monkey", "penguin", "dolphin", "whale", "shark", "octopus",
  "butterfly", "spider", "snake", "frog", "turtle", "rabbit", "horse", "cow",
  "sandwich", "hamburger", "noodles", "sushi", "taco", "cookie", "donut", "ice cream",
  "umbrella", "backpack", "glasses", "hat", "shoe", "sock", "jacket", "scarf",
  "hammer", "scissors", "paintbrush", "pencil", "notebook", "envelope", "balloon", "kite",
  "skateboard", "surfboard", "trophy", "medal", "crown", "diamond", "key", "lock",
  "microphone", "headphones", "speaker", "battery", "lightning", "tornado", "earthquake", "avalanche",
];

export function buildWordPool(customWords: string[]): string[] {
  return customWords.length > 0 ? customWords : [...DEFAULT_WORDS];
}
