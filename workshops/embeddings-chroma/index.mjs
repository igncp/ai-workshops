import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import { ChromaClient } from "chromadb";

async function main() {
  // 1. Connect to the Chroma server
  // Default is http://localhost:8000
  const client = new ChromaClient();

  const embedder = new OllamaEmbeddingFunction({
    url: "http://localhost:11434", // Default Ollama server URL
    model: "llama3.1:8b", // The model you pulled
  });

  // 2. Delete the collection if it exists (to avoid embedding function conflicts)
  try {
    await client.deleteCollection({ name: "my_js_collection" });
    console.log("Deleted existing collection");
  } catch (e) {
    console.log("No existing collection to delete");
  }

  // 3. Create or get a collection without specifying embedding function
  // The server will use its default embedding function
  const collection = await client.createCollection({
    name: "my_js_collection",
    embeddingFunction: embedder,
  });

  // 4. Add documents to the collection
  await collection.add({
    ids: ["id1", "id2", "id3"],
    metadatas: [{ source: "wiki" }, { source: "news" }, { source: "blog" }],
    documents: [
      "Pineapples are tropical fruits.",
      "The capital of France is Paris.",
      "Modern AI uses vector databases like Chroma.",
    ],
  });

  // 5. Perform a semantic search
  const results = await collection.query({
    queryTexts: ["Tell me about cities in different countries"],
    nResults: 1,
  });

  console.log("Search Results:", results.documents[0]);
}

main().catch((err) => console.error(err));
