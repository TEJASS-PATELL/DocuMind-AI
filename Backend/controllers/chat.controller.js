const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");

class GeminiEmbeddings {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = "embedding-001";
  }

  async embedContent(text) {
    const url = `https://generativelanguage.googleapis.com/v1/models/${this.model}:embedContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text: String(text) }] },
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Embedding API call failed");
    }
    if (!data.embedding || !data.embedding.values) {
      throw new Error("Invalid response format from Google Embeddings");
    }
    return data.embedding.values;
  }

  async embedDocuments(texts) {
    return Promise.all(texts.map((t) => this.embedContent(t)));
  }

  async embedQuery(text) {
    return this.embedContent(text);
  }
}

let ChatGoogleGenerativeAI = null;
const initChatModel = async () => {
  if (!ChatGoogleGenerativeAI) {
    const mod = await import("@langchain/google-genai");
    ChatGoogleGenerativeAI = mod.ChatGoogleGenerativeAI;
  }
  return ChatGoogleGenerativeAI;
};

const parsePdf = async (buffer) => {
  try {
    const pdfParse = require("pdf-parse");
    return await pdfParse(buffer);
  } catch (e) {
    throw new Error("Failed to parse PDF: " + e.message);
  }
};

exports.uploadDocument = async (req, res) => {
  try {
    const pineconeIndex = getPineconeIndex();
    const userId = req.user?.userid;
    const { sessionId } = req.body;

    if (!userId) return res.status(401).json({ msg: "User not authenticated" });
    if (!sessionId) return res.status(400).json({ msg: "Missing sessionId" });
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const embeddings = new GeminiEmbeddings();
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await parsePdf(fileBuffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(400).json({ msg: "PDF is empty or could not be parsed" });
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const chunks = await splitter.splitText(extractedText);

    const docs = chunks.map((chunk) => ({
      pageContent: chunk,
      metadata: { sessionId, userId, source: req.file.originalname },
    }));

    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(200).json({ msg: "PDF embeddings saved successfully" });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ msg: "Pinecone ingestion failed", error: error.message });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const pineconeIndex = getPineconeIndex();
    const userId = req.user?.userid;
    const { sessionId, message, language, focusMode, replyType } = req.body;

    if (!userId) return res.status(401).json({ msg: "User not authenticated" });

    const embeddings = new GeminiEmbeddings();
    const ChatModel = await initChatModel();

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

    const retriever = vectorStore.asRetriever({ k: 4 });
    const relevantDocs = await retriever.invoke(message);
    const contextText = relevantDocs.map((d) => d.pageContent).join("\n\n");

    const systemInstruction = `Answer strictly from context.
    Context: ${contextText || "No context found."}
    Language: ${language || 'English'}
    Style: ${replyType || 'Balanced'}
    Mode: ${focusMode ? 'Sharp & Precise' : 'Normal'}`;

    const model = new ChatModel({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-1.5-flash",
      temperature: 0.1,
    });

    const result = await model.invoke([
      { role: "system", content: systemInstruction },
      { role: "user", content: message },
    ]);

    return res.json({ reply: result.content });
  } catch (error) {
    return res.status(500).json({ reply: "Query failed", error: error.message });
  }
};