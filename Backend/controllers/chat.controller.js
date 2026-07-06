const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const pdfParseModule = require("pdf-parse-new");
const pdfParse = typeof pdfParseModule === "function" ? pdfParseModule : pdfParseModule.default;

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;
const processingSessions = new Set();

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

const getModel = (apiKey) => {
  return new ChatGoogleGenerativeAI({
    apiKey,
    model: "gemini-2.5-flash-lite",
    temperature: 0.3,
    maxRetries: 3,
    maxConcurrency: 1,
  });
};

const parseRetryDelayMs = (errorText, fallbackMs) => {
  try {
    const parsed = JSON.parse(errorText);
    const details = parsed?.error?.details || [];
    const retryInfo = details.find((d) => d["@type"]?.includes("RetryInfo"));
    const raw = retryInfo?.retryDelay;
    if (raw) {
      const seconds = parseFloat(String(raw).replace("s", ""));
      if (!isNaN(seconds)) return Math.ceil(seconds * 1000) + 2000;
    }
  } catch (e) {
    return fallbackMs;
  }
  return fallbackMs;
};

const embedBatchWithRetry = async (apiKey, batchTexts, retries = 5) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:batchEmbedContents?key=${apiKey}`;
  const body = {
    requests: batchTexts.map((text) => ({
      model: `models/${EMBEDDING_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIM,
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
      return (data.embeddings || []).map((e) => e.values || []);
    }

    const errorText = await response.text();

    if ((response.status === 429 || response.status === 503) && attempt < retries) {
      const fallbackDelay = 3000 * Math.pow(2, attempt);
      const delay = response.status === 429 ? parseRetryDelayMs(errorText, fallbackDelay) : fallbackDelay;
      await new Promise((resolve) => setTimeout(resolve, delay));
      continue;
    }

    throw new Error(`Embedding API error (status ${response.status}): ${errorText}`);
  }

  throw new Error("Embedding API failed after retries.");
};

const embedInBatches = async (apiKey, texts, batchSize = 80) => {
  const allVectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedBatchWithRetry(apiKey, batch);
    allVectors.push(...vectors);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 65000));
    }
  }
  return allVectors;
};

const embedSingleText = async (apiKey, text, retries = 3) => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`;
  const body = {
    model: `models/${EMBEDDING_MODEL}`,
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIM,
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return data.embedding?.values || [];
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

exports.uploadDocument = async (req, res) => {
  const lockKey = String(req.body?.sessionId || "default-session");

  if (processingSessions.has(lockKey)) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(409).json({ msg: "Ek document pehle se process ho raha hai, thoda ruko." });
  }
  processingSessions.add(lockKey);

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

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2500,
      chunkOverlap: 250,
    });

    const safeMetadata = {
      sessionId: String(sessionId || "default-session"),
      userId: String(userId || "unknown-user"),
      source: String(req.file.originalname || "unknown-file"),
    };

    const docs = await splitter.createDocuments(
      [pdfData.text],
      [safeMetadata]
    );

    const validDocs = docs.filter(doc => doc.pageContent && doc.pageContent.trim().length > 0);

    if (validDocs.length === 0) {
      throw new Error("PDF me koi valid text chunks nahi bane.");
    }

    const texts = validDocs.map((doc) => doc.pageContent);
    const vectorsArray = await embedInBatches(apiKey, texts, 90);

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
          metadata: {
            ...validDocs[i].metadata,
            text: validDocs[i].pageContent,
          },
        });
      }
    }

    if (vectorsToUpsert.length === 0) {
      throw new Error("Pinecone ke liye 0 valid records bache hain.");
    }

    console.log(`Chunks: ${validDocs.length}, Embedded: ${vectorsArray.length}, ToUpsert: ${vectorsToUpsert.length}`);
    console.log("BUILD-MARKER: v4-diagnostic");

    const BATCH_SIZE = 100;
    for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
      const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;
      const payload = { records: batch };
      console.log("Upsert payload sample:", JSON.stringify({
        recordCount: payload.records.length,
        firstRecordId: payload.records[0]?.id,
        firstRecordValuesLength: payload.records[0]?.values?.length,
        firstRecordHasMetadata: !!payload.records[0]?.metadata,
      }));
      await pineconeIndex
        .namespace(String(sessionId || "default-session"))
        .upsert(payload);
    }

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(200).json({ msg: "Success", chunksUploaded: vectorsToUpsert.length });
  } catch (error) {
    console.error("Upload Error:", error);
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ msg: "Connection failed", error: error.message });
  } finally {
    processingSessions.delete(lockKey);
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

    const model = getModel(apiKey);

    if (isGreeting(message)) {
      const prompt = `You are a helpful AI chatbot. Respond politely to the user greeting "${message}" in ${language || "Hinglish"}.`;
      const result = await model.invoke(prompt);
      return res.json({ reply: result.content });
    }

    let context = "";
    try {
      const pineconeIndex = await getPineconeIndex();
      const queryVector = await embedSingleText(apiKey, message);

      const searchResult = await pineconeIndex
        .namespace(String(sessionId || "default-session"))
        .query({
          vector: queryVector,
          topK: 4,
          includeMetadata: true,
        });

      context = (searchResult.matches || [])
        .map((match) => match.metadata?.text || "")
        .filter(Boolean)
        .join("\n");
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