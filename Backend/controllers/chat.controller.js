const path = require("path");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { OfficeParser } = require("officeparser");

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 1024;
const processingSessions = new Set();

const EXTENSION_TO_FILETYPE = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".pptx": "pptx",
  ".xlsx": "xlsx",
  ".odt": "odt",
  ".odp": "odp",
  ".ods": "ods",
  ".rtf": "rtf",
  ".md": "md",
  ".html": "html",
  ".csv": "csv",
};

const extractTextFromFile = async (buffer, originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();

  if (ext === ".txt") {
    const text = buffer.toString("utf-8").trim();
    if (!text) {
      throw new Error("Text file appears to be empty.");
    }
    return text;
  }

  const fileType = EXTENSION_TO_FILETYPE[ext];
  if (!fileType) {
    throw new Error(
      `Unsupported file type "${ext || "unknown"}". Supported types: pdf, docx, pptx, xlsx, txt, odt, odp, ods, rtf, md, html, csv.`
    );
  }

  try {
    const ast = await OfficeParser.parseOffice(buffer, { fileType });
    const result = await ast.to("text");
    const text = (result?.value || "").trim();
    if (!text) {
      throw new Error("No text could be extracted from the file.");
    }
    return text;
  } catch (e) {
    throw new Error(`File parse failed: ${e.message}`);
  }
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

const embedInBatches = async (apiKey, texts, batchSize = 20) => {
  const allVectors = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vectors = await embedBatchWithRetry(apiKey, batch);
    allVectors.push(...vectors);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 61000));
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
    return res.status(409).json({ msg: "A document is already being processed, please wait." });
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
    const extractedText = await extractTextFromFile(fileBuffer, req.file.originalname);

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("File was parsed but no text was found.");
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
      [extractedText],
      [safeMetadata]
    );

    const validDocs = docs.filter(doc => doc.pageContent && doc.pageContent.trim().length > 0);

    if (validDocs.length === 0) {
      throw new Error("No valid text chunks could be created from the PDF.");
    }

    const texts = validDocs.map((doc) => doc.pageContent);
    const vectorsArray = await embedInBatches(apiKey, texts, 20);

    if (!vectorsArray || vectorsArray.length === 0) {
      throw new Error("Failed to generate embeddings from the Google API.");
    }

    const vectorsToUpsert = [];

    for (let i = 0; i < validDocs.length; i++) {
      const vec = vectorsArray[i];
      if (Array.isArray(vec) && vec.length > 0) {
        vectorsToUpsert.push({
          id: `vec_${Date.now()}_${i}`,
          values: vec,
          metadata: {
            sessionId: safeMetadata.sessionId,
            userId: safeMetadata.userId,
            source: safeMetadata.source,
            text: validDocs[i].pageContent,
          },
        });
      }
    }

    if (vectorsToUpsert.length === 0) {
      throw new Error("No valid records remained to upsert into Pinecone.");
    }

    console.log(`Chunks: ${validDocs.length}, Embedded: ${vectorsArray.length}, ToUpsert: ${vectorsToUpsert.length}`);

    const BATCH_SIZE = 100;
    for (let i = 0; i < vectorsToUpsert.length; i += BATCH_SIZE) {
      const batch = vectorsToUpsert.slice(i, i + BATCH_SIZE);
      if (batch.length === 0) continue;
      await pineconeIndex
        .namespace(String(sessionId || "default-session"))
        .upsert({ records: batch });
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

    const prompt = `Context: ${context || "No context available."}\n\nQuestion: ${message}\nAnswer in ${language || "English"}:`;
    const result = await model.invoke(prompt);
    return res.json({ reply: result.content });
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ reply: "Connection failed", error: error.message });
  }
};