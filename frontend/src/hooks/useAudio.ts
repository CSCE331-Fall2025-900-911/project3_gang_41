// Audio hook for TTS sound effects - supports random selection from variants
const audioCache: Record<string, HTMLAudioElement> = {};

const SOUND_MAP: Record<string, string[]> = {
  intro: ['intro'],
  drink: ['drink-1', 'drink-2', 'drink-3'], // Random selection
  options: ['options'],
  cash: ['cash'],
  confirmed: ['confirmed'],
};

export type SoundEvent = keyof typeof SOUND_MAP;

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useAudio() {
  const play = (event: SoundEvent) => {
    const variants = SOUND_MAP[event];
    if (!variants) return;

    const sound = pickRandom(variants);
    if (!audioCache[sound]) {
      audioCache[sound] = new Audio(`/audio/${sound}.mp3`);
    }
    audioCache[sound].currentTime = 0;
    audioCache[sound].play().catch(() => {}); // Ignore autoplay errors
  };

  return { play };
}
