"""Intelligibility QA: transcribe an audio file with faster-whisper and save <file>.asr.txt.

Usage: python asr_check.py ../audio/master.wav [model=small.en]
"""
import subprocess, sys
import numpy as np
from faster_whisper import WhisperModel

m = WhisperModel(sys.argv[2] if len(sys.argv) > 2 else "small.en", device="cpu", compute_type="int8")
# Decode with ffmpeg (passing a path straight to faster-whisper trips a PyAV metadata bug).
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", sys.argv[1], "-ac", "1", "-ar", "16000", "-f", "f32le", "-"], capture_output=True, check=True).stdout
segs, _ = m.transcribe(np.frombuffer(raw, np.float32), beam_size=5, vad_filter=False)
txt = " ".join(s.text.strip() for s in segs)
open(sys.argv[1] + ".asr.txt", "w").write(txt)
print(txt)
