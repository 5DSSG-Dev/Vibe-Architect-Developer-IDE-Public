// The Luminary's Voice (STP-0002 P27). With Voice on, each reply that passed the gauge is read aloud
// with the browser's own speech, which runs on the Architect's PC, with the voice and speed the
// Architect picks. The Architect can also hold a button to talk: the microphone is on only while
// the button is held, never in the background (D4.2), and the words land in the question box to
// check before sending. Chrome and Edge send that audio to Google or Microsoft to turn it into
// text, which the panel says plainly. Everything said either way stays as text in the record.

const VOICE_STORAGE = 'vibe-luminary-voice';

export interface VoiceSettings {
  on: boolean;
  /** The browser voice's name; empty uses the browser's default voice. */
  voiceName: string;
  /** 0.8 (slower) to 1.3 (faster); 1 is normal. */
  rate: number;
}

export const VOICE_RATES: readonly { rate: number; label: string }[] = [
  { rate: 0.85, label: 'Slower' },
  { rate: 1, label: 'Normal' },
  { rate: 1.2, label: 'Faster' },
];

const DEFAULT_SETTINGS: VoiceSettings = { on: false, voiceName: '', rate: 1 };

export function readVoiceSettings(): VoiceSettings {
  try {
    const stored = JSON.parse(localStorage.getItem(VOICE_STORAGE) ?? 'null') as Partial<VoiceSettings> | null;
    if (!stored) return DEFAULT_SETTINGS;
    return {
      on: stored.on === true,
      voiceName: typeof stored.voiceName === 'string' ? stored.voiceName : '',
      rate: typeof stored.rate === 'number' && stored.rate >= 0.5 && stored.rate <= 2 ? stored.rate : 1,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveVoiceSettings(settings: VoiceSettings): void {
  try {
    localStorage.setItem(VOICE_STORAGE, JSON.stringify(settings));
  } catch {
    // Without storage the choice still applies for this visit.
  }
}

const SPOKEN_CHARS = 1200;

/**
 * The words to read aloud: code is never read (it is pointed to the panel), Markdown marks are
 * dropped, and a very long reply stops at a sentence with a pointer to the panel.
 */
export function speakableText(content: string): string {
  const hadCode = /```[\s\S]*?```/.test(content);
  const words = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
  let text = words;
  let shortened = false;
  if (text.length > SPOKEN_CHARS) {
    const cut = text.slice(0, SPOKEN_CHARS);
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
    text = end > 0 ? cut.slice(0, end + 1) : `${cut.trimEnd()}…`;
    shortened = true;
  }
  if (!text) return hadCode ? 'I wrote some code. It is in the panel.' : '';
  if (hadCode) return `${text} The code is in the panel.`;
  return shortened ? `${text} The rest is in the panel.` : text;
}

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export const canSpeak = (): boolean => synth() !== null;

export function voicesAvailable(): SpeechSynthesisVoice[] {
  return synth()?.getVoices() ?? [];
}

/** Read words aloud, replacing anything still being read. */
export function speak(text: string, settings: VoiceSettings): void {
  const engine = synth();
  if (!engine || !text.trim()) return;
  engine.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = engine.getVoices().find((entry) => entry.name === settings.voiceName);
  if (voice) utterance.voice = voice;
  utterance.rate = settings.rate;
  engine.speak(utterance);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}

// The browser's speech-to-text. Typed loosely: it is not in TypeScript's DOM library everywhere.
interface RecognitionResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionConstructor = new () => Recognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const canListen = (): boolean => recognitionConstructor() !== null;

/**
 * Start listening while the talk button is held. `onWords` receives everything heard so far in this
 * hold (final and still-forming words together); the caller decides what to do with it.
 */
export function listen(onWords: (words: string) => void, onError: (reason: string) => void, onEnd: () => void): Recognition | null {
  const Constructor = recognitionConstructor();
  if (!Constructor) return null;
  const recognition = new Constructor();
  recognition.lang = typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US';
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (event) => {
    let words = '';
    for (let i = 0; i < event.results.length; i++) words += event.results[i][0].transcript;
    onWords(words.trim());
  };
  recognition.onerror = (event) => onError(listenErrorText(event.error));
  recognition.onend = onEnd;
  recognition.start();
  return recognition;
}

export function listenErrorText(code: string): string {
  if (code === 'not-allowed' || code === 'service-not-allowed') return 'The browser did not allow the microphone. You can allow it from the address bar.';
  if (code === 'no-speech') return 'I did not hear anything. Hold the button while you speak.';
  if (code === 'network') return 'The browser could not reach its speech service, so nothing was heard.';
  if (code === 'aborted') return '';
  return `Listening stopped (${code}).`;
}
