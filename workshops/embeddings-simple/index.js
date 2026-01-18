import { pipeline } from '@huggingface/transformers';

// Initialize the feature-extraction pipeline with a local-compatible model
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

// Generate embeddings for a string
const text = "LlamaIndex is an amazing tool for RAG.";
const output = await extractor(text, { pooling: 'mean', normalize: true });

// Convert the output tensor to a standard JavaScript array
const embedding = output.data;
console.log(embedding);