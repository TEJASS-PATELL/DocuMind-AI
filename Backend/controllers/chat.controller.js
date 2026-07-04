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
    model: "text-embedding-004",
  });
  return { model, embeddings };
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

    const { embeddings } = getModelAndEmbeddings(apiKey);
    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await parsePdf(fileBuffer);

    if (!pdfData || !pdfData.text || pdfData.text.trim().length === 0) {
      throw new Error("PDF parse hui, par text nahi mila. Scanned PDF ho sakti hai.");
    }

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const safeMetadata = {
      sessionId: String(sessionId || "default-session"),
      userId: String(userId || "unknown-user"),
      source: String(req.file.originalname || "unknown-file")
    };

    const docs = await splitter.createDocuments(
      [pdfData.text],
      [safeMetadata]
    );

    if (!docs || docs.length === 0) {
      throw new Error("Text chunks empty hain.");
    }

    const ids = docs.map((_, i) => `doc-${Date.now()}-${i}`);

    const vectorStore = new PineconeStore(embeddings, {
      pineconeIndex,
      namespace: String(sessionId || "default-session"),
    });

    await vectorStore.addDocuments(docs, { ids: ids });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(200).json({ msg: "Success" });
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