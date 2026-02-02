import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import { ChromaClient } from "chromadb";

async function main() {
  console.log("=== ChromaDB Feature Testing ===\n");

  // 1. Connect to the Chroma server
  const client = new ChromaClient();
  console.log("✓ Connected to ChromaDB");

  const embedder = new OllamaEmbeddingFunction({
    url: "http://localhost:11434",
    model: "llama3.1:8b",
  });

  // 2. Delete the collection if it exists
  try {
    await client.deleteCollection({ name: "my_js_collection" });
    console.log("✓ Deleted existing collection\n");
  } catch (e) {
    console.log("✓ No existing collection to delete\n");
  }

  // 3. Create collection with specific distance metric
  const collection = await client.createCollection({
    name: "my_js_collection",
    embeddingFunction: embedder,
    metadata: {
      "hnsw:space": "cosine", // Options: "cosine", "l2", "ip" (inner product)
      description: "Test collection for various ChromaDB features"
    },
  });
  console.log("✓ Created collection with cosine distance\n");

  // 4. Add documents with rich metadata
  await collection.add({
    ids: ["id1", "id2", "id3", "id4", "id5"],
    metadatas: [
      { source: "wiki", category: "food", year: 2020, verified: true },
      { source: "news", category: "geography", year: 2023, verified: true },
      { source: "blog", category: "technology", year: 2024, verified: true },
      { source: "wiki", category: "geography", year: 2022, verified: false },
      { source: "news", category: "technology", year: 2024, verified: true },
    ],
    documents: [
      "Pineapples are tropical fruits.",
      "The capital of France is Paris.",
      "Modern AI uses vector databases like Chroma.",
      "Tokyo is the capital of Japan and one of the largest cities in the world.",
      "Vector embeddings allow semantic search across text documents.",
    ],
  });
  console.log("✓ Added 5 documents with metadata\n");

  // 5. Basic semantic search
  console.log("--- Test 1: Basic Semantic Search ---");
  const results1 = await collection.query({
    queryTexts: ["Tell me about cities in different countries"],
    nResults: 2,
  });
  console.log("Query: 'Tell me about cities'");
  console.log("Results:", results1.documents[0]);
  console.log("IDs:", results1.ids[0]);
  console.log("Distances:", results1.distances[0], "\n");

  // 6. Filtered search with metadata (where clause)
  console.log("--- Test 2: Filtered Search (metadata) ---");
  const results2 = await collection.query({
    queryTexts: ["information technology"],
    nResults: 10,
    where: { category: "technology" },
  });
  console.log("Query: 'information technology' WHERE category='technology'");
  console.log("Results:", results2.documents[0]);
  console.log("Metadata:", results2.metadatas[0], "\n");

  // 7. Complex metadata filtering
  console.log("--- Test 3: Complex Metadata Filtering ---");
  const results3 = await collection.query({
    queryTexts: ["world information"],
    nResults: 10,
    where: {
      $and: [
        { year: { $gte: 2022 } },
        { verified: true }
      ]
    },
  });
  console.log("Query: 'world information' WHERE year >= 2022 AND verified=true");
  console.log("Results:", results3.documents[0]);
  console.log("Metadata:", results3.metadatas[0], "\n");

  // 8. Get documents by IDs
  console.log("--- Test 4: Get by IDs ---");
  const getResults = await collection.get({
    ids: ["id1", "id3"],
  });
  console.log("Get documents with ids: ['id1', 'id3']");
  console.log("Documents:", getResults.documents);
  console.log("Metadata:", getResults.metadatas, "\n");

  // 9. Peek at collection
  console.log("--- Test 5: Peek at Collection ---");
  const peekResults = await collection.peek({ limit: 3 });
  console.log("Peek at first 3 documents:");
  console.log("IDs:", peekResults.ids);
  console.log("Documents:", peekResults.documents, "\n");

  // 10. Count documents in collection
  console.log("--- Test 6: Collection Count ---");
  const count = await collection.count();
  console.log("Total documents in collection:", count, "\n");

  // 11. Update existing documents
  console.log("--- Test 7: Update Operation ---");
  await collection.update({
    ids: ["id1"],
    metadatas: [{ source: "wiki", category: "food", year: 2025, verified: true, updated: true }],
    documents: ["Pineapples are delicious tropical fruits with high vitamin C content."],
  });
  const updatedDoc = await collection.get({ ids: ["id1"] });
  console.log("Updated document id1:");
  console.log("Document:", updatedDoc.documents[0]);
  console.log("Metadata:", updatedDoc.metadatas[0], "\n");

  // 12. Upsert operation (add or update)
  console.log("--- Test 8: Upsert Operation ---");
  await collection.upsert({
    ids: ["id6", "id1"], // id6 is new, id1 already exists
    metadatas: [
      { source: "blog", category: "science", year: 2024, verified: true },
      { source: "wiki", category: "food", year: 2026, verified: true, upserted: true }
    ],
    documents: [
      "Machine learning models require large amounts of training data.",
      "Pineapples are amazing tropical fruits, updated via upsert.",
    ],
  });
  console.log("Upserted id6 (new) and id1 (existing)");
  const upsertedDocs = await collection.get({ ids: ["id1", "id6"] });
  console.log("Documents:", upsertedDocs.documents);
  console.log("Metadata:", upsertedDocs.metadatas, "\n");

  // 13. Where document filtering (search by document content)
  console.log("--- Test 9: Where Document Filtering ---");
  const results4 = await collection.get({
    whereDocument: { $contains: "tropical" },
  });
  console.log("Get documents containing 'tropical':");
  console.log("IDs:", results4.ids);
  console.log("Documents:", results4.documents, "\n");

  // 14. List all collections
  console.log("--- Test 10: List Collections ---");
  const collections = await client.listCollections();
  console.log("All collections:", collections.map(c => c.name));
  console.log("\n");

  // 15. Delete specific documents
  console.log("--- Test 11: Delete Documents ---");
  await collection.delete({ ids: ["id4"] });
  const newCount = await collection.count();
  console.log("Deleted document id4");
  console.log("New document count:", newCount, "\n");

  // 16. Get with metadata filtering (without query)
  console.log("--- Test 12: Get with Metadata Filter ---");
  const filteredGet = await collection.get({
    where: { category: "technology" },
    limit: 10,
  });
  console.log("Get all documents WHERE category='technology':");
  console.log("IDs:", filteredGet.ids);
  console.log("Documents:", filteredGet.documents, "\n");

  // 17. Query with include options
  console.log("--- Test 13: Query with Custom Include ---");
  const results5 = await collection.query({
    queryTexts: ["fruits and food"],
    nResults: 2,
    include: ["documents", "metadatas", "distances"], // Specify what to include
  });
  console.log("Query: 'fruits and food' (with custom include)");
  console.log("Results:", results5.documents[0]);
  console.log("Distances:", results5.distances[0]);
  console.log("Metadata:", results5.metadatas[0], "\n");

  console.log("=== All tests completed successfully! ===");
}

main().catch((err) => console.error("Error:", err));
