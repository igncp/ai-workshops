import torch
import sys
from diffusers import DiffusionPipeline

default_model = "stabilityai/stable-diffusion-xl-base-1.0"
model_id = sys.argv[2] if len(sys.argv) > 2 else default_model
device = "cuda" if torch.cuda.is_available() else "mps"

# 2. Load the pipeline
# Use torch.float16 for efficiency, especially on GPUs
# "cuda" moves the model to the GPU
pipe = DiffusionPipeline.from_pretrained(
    model_id,
    torch_dtype=torch.float16 if device == "cuda" else torch.float32, 
    variant="fp16",
    use_safetensors=True
)
pipe.to(device)

# Optional: Enable memory efficient attention (requires xformers to be installed: pip install xformers)
# pipe.enable_xformers_memory_efficient_attention()

# 3. Define your prompt (CLI arg wins)
default_prompt = "An astronaut riding a horse on Mars, high detail, 8k, cinematic lighting, photorealistic"
prompt = sys.argv[1] if len(sys.argv) > 1 else default_prompt

# 4. Generate the image
# Adjust parameters like num_inference_steps, guidance_scale, height, and width as needed
image = pipe(
    prompt=prompt,
    num_inference_steps=25, # A good balance, more steps increase quality but also time
    guidance_scale=7.5, # Controls how strongly the prompt influences the image
    width=1024,
    height=1024 # Recommended dimensions for SDXL
).images[0]

# 5. Save the image
image.save("output_image.png")
print("Image saved as output_image.png")
