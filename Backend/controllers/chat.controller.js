const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");
const {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} = require("@langchain/google-genai");

const pdfParseModule = require("pdf-parse-new");
const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;

const EMBEDDING_MODEL = "text-embedding-004";

const parsePdf = async (buffer) => {
  try {
    if (typeof pdfParse !== "function") {
      throw new Error("Cannot find valid pdfParse function in module.");
    }
    const data = await pdfParse(buffer);
    return data;
  } catch (e) {
    throw new Error("PDF parse fail: " + e.message);
  }
};

const isGreeting = (msg) => {
  const greetings = [
    "hi", "hello", "hey", "hola", "sup",
    "good morning", "good afternoon", "good evening",
  ];
  const cleaned = msg.toLowerCase().trim().replace(/\s+/g, " ");
  return greetings.some(
    (g) => cleaned === g || cleaned.startsWith(g + " ") || cleaned.endsWith(" " + g)
  );
};

const getModelAndEmbeddings = (apiKey) => {
  const model = new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-flash-lite",
    temperature: 0.3,
    maxRetries: 3,
    maxConcurrency: 1,
  });
  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model: EMBEDDING_MODEL,
  });
  return { model, embeddings };
};

const embedBatchWithRetry = async (apiKey, batchTexts, retries = 3) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
  const body = {
    requests: batchTexts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT"
    })),
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.embeddings || data.embeddings.length === 0) {
        console.error("Gemini API Empty Response:", JSON.stringify(data));
        throw new Error("Gemini ne 200 OK diya par embeddings nahi bheje.");
      }
      return data.embeddings.map((e) => e.values || []);
    }

    const errorText = await response.text();

    if ((response.status === 429 || response.status === 503) && attempt < retries) {
      const delay = 1000 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`Embedding API error (status ${response.status}): ${errorText}`);
  }

  throw new Error("Embedding API failed after retries.");
};

const embedInBatches = async (apiKey, texts, batchSize = 20) => {
  const allVectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedBatchWithRetry(apiKey, batch);
    allVectors.push(...vectors);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  return allVectors;
};

exports.uploadDocument = async (req, res) => {
  try {
    const pineconeIndex = await getPineconeIndex();
    const userId = req.user?.userid;
    const { sessionId } = req.body;

    if (!userId || !req.file) {
      return res.status(400).json({ msg: "Data missing" });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ msg: "API key missing" });
    }

    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await parsePdf(fileBuffer);

    if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF parse hui, par text nahi mila.");
    }

    const cleanedText = pdfData.text.replace(/\x00/g, "").replace(/\s+/g, " ").trim();

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const safeMetadata = {
      sessionId: String(sessionId || "default-session"),
      userId: String(userId || "unknown-user"),
      source: String(req.file.originalname || "unknown-file"),
    };

    const docs = await splitter.createDocuments(
      [cleanedText],
      [safeMetadata]
    );

    const validDocs = docs.filter(doc => doc.pageContent && doc.pageContent.trim().length > 0);

    if (validDocs.length === 0) {
      throw new Error("PDF me koi valid text chunks nahi bane.");
    }

    const texts = validDocs.map((doc) => doc.pageContent);
    const vectorsArray = await embedInBatches(apiKey, texts, 20);

    if (!vectorsArray || vectorsArray.length === 0) {
      throw new Error("Google API se embeddings generate nahi ho paye.");
    }

    const vectorsToUpsert = [];

    for (let i = 0; i < validDocs.length; i++) {
      const vec = vectorsArray[i];
      if (Array.isArray(vec) && vec.length > 0) {
        vectorsToUpsert.push({
          id: `vec_${Date.now()}_${i}`,
          values: vec,
          metadata: validDocs[i].metadata,
        });
      }
    }

    if (vectorsToUpsert.length === 0) {
      throw new Error("Pinecone ke liye 0 valid records bache hain.");
    }

    const BATCH_SIZE = 50;
    for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
      const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
      await pineconeIndex
        .namespace(String(sessionId || "default-session"))
        .upsert(batch);
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(200).json({ msg: "Success", chunksUploaded: vectorsToUpsert.length });
  } catch (error) {
    console.error("Upload Error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ msg: "Connection failed", error: error.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const { sessionId, message, language } = req.body;
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

    if (!apiKey) {
      return res.status(500).json({ reply: "API Key configuration missing." });
    }
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ reply: "Message cannot be empty." });
    }

    const { model, embeddings } = getModelAndEmbeddings(apiKey);

    if (isGreeting(message)) {
      const prompt = `You are a helpful AI chatbot. Respond politely to the user greeting "${message}" in ${language || "Hinglish"}.`;
      const result = await model.invoke(prompt);
      return res.json({ reply: result.content });
    }

    const pineconeIndex = await getPineconeIndex();
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

    let context = "";
    try {
      const results = await vectorStore.similaritySearch(message, 4);
      context = results.map((r) => r.pageContent).join("\n");
    } catch (e) {
      console.warn("Similarity search failed:", e.message);
    }

    const prompt = `Context: ${context || "No context available."}\n\nQuestion: ${message}\nAnswer in ${language || "Hinglish"}:`;
    const result = await model.invoke(prompt);
    return res.json({ reply: result.content });
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ reply: "Connection failed", error: error.message });
  }
};