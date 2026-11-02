/**
 * Speech Synthesis Utility
 * Uses Web Speech API for "Listen to this page" functionality.
 */

export type SpeechState = {
  speaking: boolean;
  paused: boolean;
  voice: SpeechSynthesisVoice | null;
  rate: number; // 0.5x to 2x
};

export type SpeechPreferences = {
  voiceName?: string;
  rate?: number;
};

const STORAGE_KEY = "babulus-speech-preferences";

/**
 * Get available voices from the browser.
 * Note: voices may not be immediately available on page load.
 */
export function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    // Voices may load asynchronously
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };

    // Timeout after 2 seconds
    setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, 2000);
  });
}

/**
 * Get preferred voice based on user preferences or sensible defaults.
 */
export async function getPreferredVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await getAvailableVoices();
  if (voices.length === 0) return null;

  const prefs = loadSpeechPreferences();

  // Try to find saved voice
  if (prefs.voiceName) {
    const savedVoice = voices.find((v) => v.name === prefs.voiceName);
    if (savedVoice) return savedVoice;
  }

  // Default to first English voice or first voice
  const englishVoice = voices.find((v) => v.lang.startsWith("en-"));
  return englishVoice || voices[0];
}

/**
 * Strip HTML tags and extract plain text for speech synthesis.
 */
export function htmlToPlainText(html: string): string {
  // Create a temporary DOM element to parse HTML
  if (typeof document === "undefined") {
    // Server-side: use regex (less accurate but works)
    return html
      .replace(/<script[^>]*>.*?<\/script>/gis, "") // Remove script tags
      .replace(/<style[^>]*>.*?<\/style>/gis, "") // Remove style tags
      .replace(/<[^>]+>/g, " ") // Remove all other tags
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  // Client-side: use DOM parser (more accurate)
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = html;

  // Remove script and style elements
  const scripts = tempDiv.querySelectorAll("script, style");
  scripts.forEach((el) => el.remove());

  return tempDiv.textContent?.replace(/\s+/g, " ").trim() || "";
}

/**
 * Speak the given text using Web Speech API.
 */
export function speak(
  text: string,
  options?: {
    voice?: SpeechSynthesisVoice | null;
    rate?: number;
    onEnd?: () => void;
    onError?: (error: SpeechSynthesisErrorEvent) => void;
  }
): SpeechSynthesisUtterance {
  // Stop any current speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  if (options?.voice) {
    utterance.voice = options.voice;
  }

  utterance.rate = options?.rate ?? 1;

  if (options?.onEnd) {
    utterance.onend = options.onEnd;
  }

  if (options?.onError) {
    utterance.onerror = options.onError;
  }

  window.speechSynthesis.speak(utterance);

  return utterance;
}

/**
 * Pause current speech.
 */
export function pause() {
  window.speechSynthesis.pause();
}

/**
 * Resume paused speech.
 */
export function resume() {
  window.speechSynthesis.resume();
}

/**
 * Stop current speech.
 */
export function stop() {
  window.speechSynthesis.cancel();
}

/**
 * Check if speech synthesis is speaking.
 */
export function isSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}

/**
 * Check if speech synthesis is paused.
 */
export function isPaused(): boolean {
  return window.speechSynthesis.paused;
}

/**
 * Load speech preferences from localStorage.
 */
export function loadSpeechPreferences(): SpeechPreferences {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load speech preferences:", error);
  }

  return {};
}

/**
 * Save speech preferences to localStorage.
 */
export function saveSpeechPreferences(prefs: SpeechPreferences) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Failed to save speech preferences:", error);
  }
}

/**
 * Get current speech state.
 */
export async function getSpeechState(): Promise<SpeechState> {
  const voice = await getPreferredVoice();
  const prefs = loadSpeechPreferences();

  return {
    speaking: isSpeaking(),
    paused: isPaused(),
    voice,
    rate: prefs.rate ?? 1,
  };
}
