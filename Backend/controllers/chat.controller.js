const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");

// Direct v1 API call — bypasses langchain wrapper and v1beta issue completely
class GeminiEmbeddings {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.model = "text-embedding-004";
  }

  async embedContent(text) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: `models/${this.model}`,
          content: { parts: [{ text }] },
        }),
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || "Embedding API call failed");
    }
    return data.embedding.values;
  }

  async embedDocuments(texts) {
    const results = await Promise.all(texts.map((t) => this.embedContent(t)));
    return results;
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
  const pdfParseModule = require("pdf-parse");
  const pdfParse = typeof pdfParseModule === "function"
    ? pdfParseModule
    : pdfParseModule.default;
  if (typeof pdfParse !== "function") {
    throw new Error("pdf-parse module could not be loaded as a function");
  }
  return pdfParse(buffer);
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
      metadata: {
        sessionId,
        userId,
        source: req.file.originalname,
      },
    }));

    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex,
      namespace: sessionId,
      maxConcurrency: 5,
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      msg: "PDF embeddings saved successfully in Pinecone",
    });
  } catch (error) {
    console.error("Error in uploadDocument:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      msg: "Pinecone ingestion failed",
      error: error.message,
    });
  }
};

exports.askQuestion = async (req, res) => {
  try {
    const pineconeIndex = getPineconeIndex();
    const userId = req.user?.userid;
    const {
      sessionId,
      message,
      language = "english",
      focusMode,
      replyType = "Concise",
    } = req.body;

    if (!userId) return res.status(401).json({ msg: "User not authenticated" });
    if (!sessionId || !message)
      return res.status(400).json({ msg: "Missing sessionId or message" });

    const embeddings = new GeminiEmbeddings();
    const ChatModel = await initChatModel();

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

    const retriever = vectorStore.asRetriever({ k: 4 });
    const relevantDocs = await retriever.invoke(message);
    const contextText = relevantDocs.map((d) => d.pageContent).join("\n\n");

    let baseSystemInstruction = focusMode
      ? "You are in Focus Mode. Be extra sharp, analytical, and precise."
      : "You are an expert document assistant.";

    baseSystemInstruction += `\nRespond in language: ${language},\nand format response style as: ${replyType}.`;

    const systemInstruction = `
${baseSystemInstruction}

CRITICAL INSTRUCTION:
Answer the user's question based strictly on the Context provided below.

If the context doesn't contain the answer, politely say:
"Bro, uploaded document me ye information nahi mili."

--- DOCUMENT CONTEXT START ---
${contextText || "No matching context found for this session."}
--- DOCUMENT CONTEXT END ---
`;

    const tokenMap = (type) => {
      const normalized = type.toLowerCase();
      if (normalized.includes("short")) return 900;
      if (normalized.includes("balanced")) return 1400;
      if (normalized.includes("detailed")) return 2500;
      return 1800;
    };

    const model = new ChatModel({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-2.5-flash",
      temperature: 0.1,
      maxOutputTokens: tokenMap(replyType),
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const result = await model.invoke([
      { role: "system", content: systemInstruction },
      { role: "user", content: message },
    ]);

    return res.json({ reply: result.content });
  } catch (error) {
    console.error("Error in askQuestion RAG:", error);
    return res.status(500).json({
      reply: "Sorry, vector DB query failed.",
      error: error.message,
    });
  }
};