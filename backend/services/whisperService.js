import { pipeline } from "@xenova/transformers";

/** `whisper-tiny` is much faster on CPU than `small`; set WHISPER_MODEL for higher accuracy. */
const MODEL =
  process.env.WHISPER_MODEL?.trim() || "Xenova/whisper-tiny";

/**
 * Set WHISPER_SEGMENT_AUGMENT=1 to request segment timestamps (slower; may help filler merge).
 * Default off for lowest latency.
 */
const SEGMENT_AUGMENT = process.env.WHISPER_SEGMENT_AUGMENT === "1";

/** @type {Promise<import('@xenova/transformers').AutomaticSpeechRecognitionPipeline> | null} */
let transcriberPromise = null;

/**
 * Lazy-load Whisper (downloads model on first use — can take minutes on first run).
 */
export function loadWhisperPipeline() {
  if (!transcriberPromise) {
    transcriberPromise = pipeline("automatic-speech-recognition", MODEL);
  }
  return transcriberPromise;
}

/**
 * @param {Float32Array} samples Mono PCM at `sampleRate` Hz (typically 16000).
 * @param {number} sampleRate
 * @param {{ language?: 'en' | 'hi' }} opts
 * @returns {Promise<{ text: string, augment: string }>}
 */
export async function transcribeChunk(samples, sampleRate, opts = {}) {
  if (!(samples instanceof Float32Array) || samples.length === 0) {
    return { text: "", augment: "" };
  }

  const minSamples = Math.floor(sampleRate * 0.22);
  if (samples.length < minSamples) {
    return { text: "", augment: "" };
  }

  const transcriber = await loadWhisperPipeline();

  const langHint =
    opts.language === "hi" ? "hindi" : opts.language === "en" ? "english" : null;

  const runOpts = {
    chunk_length_s: 0,
    task: "transcribe",
    num_beams: 1,
    ...(SEGMENT_AUGMENT ? { return_timestamps: true } : {}),
    ...(langHint ? { language: langHint } : {}),
  };

  let out;
  try {
    out = await transcriber(samples, runOpts);
  } catch (err) {
    console.warn("Whisper pass with language hint failed, retrying auto:", err?.message);
    out = await transcriber(samples, {
      chunk_length_s: 0,
      task: "transcribe",
      num_beams: 1,
      ...(SEGMENT_AUGMENT ? { return_timestamps: true } : {}),
    });
  }

  const raw = Array.isArray(out) ? out[0] : out;
  const text = typeof raw?.text === "string" ? raw.text.trim() : "";

  let augment = "";
  if (SEGMENT_AUGMENT && raw?.chunks?.length) {
    const joined = raw.chunks
      .map((c) => (typeof c.text === "string" ? c.text.trim() : ""))
      .filter(Boolean)
      .join(" ");
    const n = (s) => s.replace(/\s+/g, " ").trim();
    if (joined && n(joined) !== n(text)) {
      augment = joined;
    }
  }

  return { text, augment };
}
