from langchain_huggingface.llms import HuggingFacePipeline
from langchain_core.prompts import PromptTemplate
import torch
import sys

default_model_id = "distilgpt2"
model_id = sys.argv[2] if len(sys.argv) > 2 else default_model_id

# Create the HuggingFacePipeline instance
# This automatically handles downloading and configuring the model
hf_pipeline = HuggingFacePipeline.from_model_id(
    model_id=model_id,
    task="text-generation",
    # Pass pipeline-specific arguments here
    pipeline_kwargs={
        "max_new_tokens": 100,
        "pad_token_id": 50256,  # Recommended for distilgpt2 to avoid warnings
    },
    device=0 if torch.cuda.is_available() else -1,
)

# Define a prompt template
template = """Question: {question}

Answer: Let's think step by step."""

prompt = PromptTemplate.from_template(template)

# Compose prompt -> LLM using LCEL (LangChain Expression Language)
chain = prompt | hf_pipeline

# Run the chain with a specific question
default_question = (
    "What are the three most important things to consider when running a local LLM?"
)
question = sys.argv[1] if len(sys.argv) > 1 else default_question
response = chain.invoke({"question": question})

print(response)
