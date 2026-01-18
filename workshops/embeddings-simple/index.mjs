import { pipeline } from '@huggingface/transformers';
import { cosineSimilarity } from 'fast-cosine-similarity';

async function getEmbeddings(text) {
    const extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

const main = async () => {
    const embedding1 = await getEmbeddings('Hello world!');
    const embedding2 = await getEmbeddings('Hi there!');
    const embedding3 = await getEmbeddings('Goodbye!');

    const similarity_1_2 = cosineSimilarity(embedding1, embedding2);
    const similarity_1_3 = cosineSimilarity(embedding1, embedding3);

    console.log('Similarity between "Hello world!" and "Hi there!": ', similarity_1_2);
    console.log('Similarity between "Hello world!" and "Goodbye!": ', similarity_1_3);
}

main()