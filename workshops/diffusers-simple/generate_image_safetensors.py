import torch
import sys
import os
import traceback
from diffusers import AutoPipelineForText2Image

# --- Configuration ---
# Set the path to your local .safetensors file
# Example: model_path = "./realisticVisionV60B1_v60B1VAE.safetensors"
default_model_path = "./path/to/your/model.safetensors"
model_path = sys.argv[2] if len(sys.argv) > 2 else default_model_path

# Define your prompt (CLI arg wins)
default_prompt = "A majestic lion wearing a golden crown, hyper realistic, detailed, 8k"
prompt = sys.argv[1] if len(sys.argv) > 1 else default_prompt
device = "cuda" if torch.cuda.is_available() else "mps"
torch_dtype = torch.float16 if device == "cuda" else torch.float32

# Define the output image filename
output_filename = "generated_image.png"
# ---------------------

try:
    if not os.path.exists(model_path):
        raise FileNotFoundError(model_path)

    # Load the model from a single .safetensors/.ckpt file
    # Note: Diffusers APIs differ by version; AutoPipeline is the most compatible.
    if hasattr(AutoPipelineForText2Image, "from_single_file"):
        pipe = AutoPipelineForText2Image.from_single_file(
            model_path,
            torch_dtype=torch_dtype,
            use_safetensors=True,
        )
    else:
        from diffusers import StableDiffusionXLPipeline

        pipe = StableDiffusionXLPipeline.from_single_file(
            model_path,
            torch_dtype=torch_dtype,
            use_safetensors=True,
        )

    # Move the pipeline to the GPU (cuda)
    pipe.to(device)

    # Run the text-to-image generation pipeline
    print(f"Generating image with prompt: '{prompt}'...")
    image = pipe(prompt=prompt).images[0]

    # Save the generated image
    image.save(output_filename)
    print(f"Image successfully saved as '{output_filename}'")

except FileNotFoundError:
    print(f"Error: Model file not found at '{model_path}'")
    print("Please check the 'model_path' variable in the script.")
except Exception as e:
    print(f"An error occurred: {e}")
    traceback.print_exc()
