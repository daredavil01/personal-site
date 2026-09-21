import { useRef, useState } from "react";
import { transcribeAudio } from "../../lib/api/ask";

// MediaRecorder's default on Chrome and Firefox; Safari answers with mp4 and
// Whisper reads both. An unsupported browser is handled by `supported` below
// rather than by a try/catch around the recorder.
const MIME = ["audio/webm", "audio/mp4"];

const pickMime = () => {
  if (typeof window === "undefined" || !window.MediaRecorder) return null;
  return MIME.find((t) => window.MediaRecorder.isTypeSupported?.(t)) ?? "";
};

// Long enough for a real question, short enough that a button left held down
// cannot upload a podcast. The endpoint caps the bytes as well — this only
// saves the visitor the round trip.
const MAX_SECONDS = 30;

/**
 * Push to talk for the /ask composer.
 *
 * The transcript is returned to the caller, which puts it in the input. It is
 * never sent as a question on its own: a misheard Marathi sentence that sends
 * itself spends an answer, logs a bad row and reads as a broken feature rather
 * than as a misheard word.
 *
 * Nothing is stored anywhere. The recording exists as one Blob, is uploaded,
 * and is dropped when this function returns.
 */
export default function useVoiceCapture({ onTranscript, getTurnstileToken } = {}) {
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const recorderRef = useRef(null);
  const stopTimerRef = useRef(null);

  const supported = typeof window !== "undefined"
    && !!window.MediaRecorder
    && !!navigator?.mediaDevices?.getUserMedia;

  const stop = () => {
    clearTimeout(stopTimerRef.current);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  };

  const start = async () => {
    setError(null);
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (_) {
      // Denied, or no microphone. Neither is an error worth a banner.
      setError("No microphone.");
      return;
    }

    const chunks = [];
    const type = pickMime();
    const recorder = new window.MediaRecorder(stream, type ? { mimeType: type } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => { if (e.data?.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      // Release the microphone before the upload, not after: the browser's
      // recording indicator should go out when the visitor says it should.
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (!blob.size) return;

      setBusy(true);
      try {
        const token = getTurnstileToken ? await getTurnstileToken() : undefined;
        const { text, language } = await transcribeAudio(blob, token);
        if (text.trim()) onTranscript?.(text.trim(), language);
        else setError("Nothing heard.");
      } catch (err) {
        setError(err.message || "Could not transcribe that.");
      } finally {
        setBusy(false);
      }
    };

    recorder.start();
    setRecording(true);
    stopTimerRef.current = setTimeout(stop, MAX_SECONDS * 1000);
  };

  return {
    supported, recording, busy, error, start, stop, toggle: () => (recording ? stop() : start()),
  };
}
