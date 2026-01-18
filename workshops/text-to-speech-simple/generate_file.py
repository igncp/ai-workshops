import torch
from transformers import SpeechT5HifiGan, pipeline
import soundfile as sf
from pathlib import Path

# Initialize the pipeline with a supported PyTorch TTS model.
# Note: Some repos (including various "*onnx*" checkpoints) can't be loaded by
# Transformers' PyTorch pipeline and will error with model type `onnx`.
model_id = "microsoft/speecht5_tts"
vocoder_id = "microsoft/speecht5_hifigan"

device = 0 if torch.cuda.is_available() else -1
vocoder = SpeechT5HifiGan.from_pretrained(vocoder_id)
synthesizer = pipeline("text-to-speech", model=model_id, vocoder=vocoder, device=device)
if synthesizer.vocoder is not None:
    synthesizer.vocoder.to(synthesizer.model.device)

# For SpeechT5, you also need a speaker embedding (x-vector).
# Newer versions of `datasets` no longer support dataset scripts (security hardening),
# so we keep a simple local cached embedding with a deterministic fallback.
speaker_embedding_path = Path(__file__).with_name("speaker_embedding.pt")

if speaker_embedding_path.exists():
    speaker_embedding = torch.load(speaker_embedding_path, map_location="mps")
else:
    torch.manual_seed(0)
    speaker_embedding = torch.randn(1, 512, dtype=torch.float32)
    torch.save(speaker_embedding, speaker_embedding_path)

# Generate speech
text = "Hi, I am a robot, nice to meet you."
speech = synthesizer(text, forward_params={"speaker_embeddings": speaker_embedding})

# Save the output to a WAV file
sf.write("output.wav", speech["audio"], samplerate=speech["sampling_rate"])
