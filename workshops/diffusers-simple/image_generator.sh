. .venv/bin/activate

PROMPT="$1"
MODEL="$2"

mkdir -p "$HOME"/images_output

while true; do
	OUTPUT_FILE="$HOME/images_output/output_$(date +%s).png"
	python generate_image_safetensors.py "$PROMPT" "$MODEL"
	mv generated_image.png "$OUTPUT_FILE"
	echo "Generated image saved to $OUTPUT_FILE"
	sleep 5
done
