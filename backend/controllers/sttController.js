import {
  loadWhisperPipeline,
  transcribeChunk,
} from "../services/whisperService.js";

/** Pre-download / compile Whisper so the first transcription is faster. */
export async function warmupWhisper(_req, res) {
  try {
    await loadWhisperPipeline();
    res.json({ ok: true, message: "Whisper model ready" });
  } catch (err) {
    console.error("Whisper warmup failed:", err);
    res.status(500).json({
      message: err?.message || "Whisper model failed to load",
    });
  }
}

/**
 * Body: raw little-endian float32 PCM (mono).
 * Headers: X-Sample-Rate (default 16000), X-STT-Lang: en | hi
 */
export async function transcribeAudio(req, res) {
  try {
    const rate = parseInt(String(req.headers["x-sample-rate"] || "16000"), 10);
    if (rate !== 16000) {
      return res
        .status(400)
        .json({ message: "Only 16000 Hz mono float32 PCM is supported" });
    }

    const langRaw = String(req.headers["x-stt-lang"] || "en").toLowerCase();
    const language = langRaw.startsWith("hi") ? "hi" : "en";

    const raw = req.body;
    let buf;
    if (Buffer.isBuffer(raw)) {
      buf = raw;
    } else if (raw instanceof Uint8Array) {
      buf = Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength);
    } else {
      buf = Buffer.from(raw ?? []);
    }
    if (buf.length < 16) {
      return res.status(400).json({ message: "Invalid or empty audio body" });
    }

    const floatCount = Math.floor(buf.length / 4);
    if (floatCount < 1) {
      return res.status(400).json({ message: "Audio buffer too short" });
    }

    const samples = new Float32Array(floatCount);
    for (let i = 0; i < floatCount; i += 1) {
      samples[i] = buf.readFloatLE(i * 4);
    }

    const { text, augment } = await transcribeChunk(samples, 16000, {
      language,
    });
    res.json({ text, augment: augment || "" });
  } catch (err) {
    console.error("transcribeAudio:", err);
    res.status(500).json({
      message: err?.message || "Transcription failed",
    });
  }
}
