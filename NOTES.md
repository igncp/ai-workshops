
## Resources

- Awesome AI tools: https://github.com/mahseema/awesome-ai-tools

## Ollama

- Default location in macOS: `~/.ollama/models`
- `ollama serve`: Runs the server which is necessary for multiple commands
- `ollama run llama3.1`: Pulls the model if not present

## Hugging Face

- To know which hugging face models are installed: `huggingface-cli scan-cache`
- To print information about the environment: `huggingface-cli env`
- The files in an LLM can be broadly categorized into model weights (brains), configuration (architecture), tokenization (vocabulary), and metadata
    - weights: `model.safetensors` (or model-0000x-of-0000x.safetensors), `*.gguf`
    - configuration: `config.json`: A crucial JSON file that defines the model's architecture. The transformers library uses this to build the model structure before loading weights.
    - configuration: `generation_config.json`. Defines default parameters for text generation, such as max_new_tokens, temperature, top_p, and do_samplec
    - tokenization: `tokenizer.json` & `tokenizer_config.json`: These files define how text is broken down into tokens (numbers) that the model can understand
    - tokenization: `tokenizer.model`, Similar to tokenizer.json, often found in Llama-based models for SentencePiece tokenization.
    - tokenization: `special_tokens_map.json`: Maps special tokens (like <|endoftext|>, <s>, </s>) to their corresponding IDs. 
    - Post about the different weight formats: https://huggingface.co/blog/ngxson/common-ai-model-formats
- Stable Diffusion XL (SDXL)

## UV

- `uv venv`: Create a new virtual environment
- `uv pip install -r requirements.tx`: Use `uv` in a pip project

## Future

- `llama-cpp`
- vLLM