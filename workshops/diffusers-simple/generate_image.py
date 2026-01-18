import torch
import sys
from diffusers import AutoPipelineForText2Image

# Check for GPU availability and set the device
device = "cuda" if torch.cuda.is_available() else "mps"
print(f"Using device: {device}")

# Initialize the pipeline and move it to the device
# The model will be downloaded the first time you run this
default_model = "stabilityai/sdxl-turbo"
model = sys.argv[2] if len(sys.argv) > 2 else default_model

pipeline = AutoPipelineForText2Image.from_pretrained(
    model,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32, 
    variant="fp16", 
    use_safetensors=True
).to(device)

# Optional: Enable memory efficient attention if you have xformers installed
# pip install xformers
# pipeline.enable_xformers_memory_efficient_attention()

# Define your prompt (CLI arg wins)
default_prompt = "A cinematic shot of a a cute panda a warrior, fantasy, intricate details, realistic"
prompt = sys.argv[1] if len(sys.argv) > 1 else default_prompt

# Generate the image
image = pipeline(prompt=prompt, num_inference_steps=1, guidance_scale=0.0).images[0]

# Save the image
image.save("output_image.png")
print("Image generated and saved as output_image.png")
