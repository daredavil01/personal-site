"""Speak one line in an Indian English voice, with word timings.

    python3 voice.py <voice> <rate> <pitch> <out.mp3> <out.json>   (text on stdin)

Microsoft's neural voices through edge-tts (pip install edge-tts) —
en-IN-NeerjaExpressiveNeural by default. Writes the audio and, beside it, the
time of every word ({"words": [{"t", "d", "w"}]}, seconds), so the film's
captions light each word as it is said rather than guessing from its length.

Behind a TLS-intercepting proxy, EDGE_TTS_CA names the CA bundle to trust;
HTTPS_PROXY is passed through.
"""

import asyncio
import json
import os
import ssl
import sys

import edge_tts
import edge_tts.communicate as communicate

if os.environ.get("EDGE_TTS_CA"):
    communicate._SSL_CTX = ssl.create_default_context(cafile=os.environ["EDGE_TTS_CA"])  # noqa: SLF001


async def main(voice, rate, pitch, out, meta):
    text = sys.stdin.read().strip()
    com = edge_tts.Communicate(
        text, voice, rate=rate, pitch=pitch, boundary="WordBoundary",
        proxy=os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy"),
    )
    words = []
    with open(out, "wb") as audio:
        async for chunk in com.stream():
            if chunk["type"] == "audio":
                audio.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                words.append({
                    "t": chunk["offset"] / 1e7,
                    "d": chunk["duration"] / 1e7,
                    "w": chunk["text"],
                })
    with open(meta, "w", encoding="utf-8") as f:
        json.dump({"voice": voice, "text": text, "words": words}, f, ensure_ascii=False)


if __name__ == "__main__":
    asyncio.run(main(*sys.argv[1:6]))
