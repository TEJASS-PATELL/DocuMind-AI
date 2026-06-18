const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const fs = require("fs");
const { getPineconeIndex } = require("../config/pinecone");

const { GoogleGenAIEmbeddings, ChatGoogleGenerativeAI } = require("@langchain/google-genai");

const parsePdf = async (buffer) => {
  try {
    const pdfParse = require("pdf-parse");
    return await pdfParse(buffer);
  } catch (e) {
    throw new Error("PDF parse fail: " + e.message);
  }
};

const isGreeting = (msg) => {
  const greetings = ["hi", "hello", "hey", "hola", "sup", "good morning", "good afternoon", "good evening"];
  return greetings.includes(msg.toLowerCase().trim());
};

exports.uploadDocument = async (req, res) => {
  try {
    const pineconeIndex = await getPineconeIndex();
    const userId = req.user?.userid;
    const { sessionId } = req.body;

    if (!userId || !req.file) return res.status(400).json({ msg: "Data missing" });

    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
      modelName: "text-embedding-004",
    });

    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await parsePdf(fileBuffer);
    
    const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
    const chunks = await splitter.splitText(pdfData.text);

    const docs = chunks.map((chunk) => ({
      pageContent: chunk,
      metadata: { sessionId, userId, source: req.file.originalname },
    }));

    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing from environment variables.");
    }

    const model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      modelName: "gemini-2.5-flash",
      temperature: 0.3,
    });

    if (isGreeting(message)) {
      const prompt = `You are a helpful AI chatbot. Respond politely to the user greeting "${message}" in ${language || 'Hinglish'}.`;
      const result = await model.invoke(prompt);
      return res.json({ reply: result.content });
    }

    const pineconeIndex = await getPineconeIndex(); 
    const embeddings = new GoogleGenAIEmbeddings({
      apiKey: apiKey,
      modelName: "text-embedding-004",
    });

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex,
      namespace: sessionId,
    });

    let context = "";
    try {
      const results = await vectorStore.similaritySearch(message, 4);
      context = results.map(r => r.pageContent).join("\n");
    } catch (e) {
      context = "";
    }

    const prompt = `Context: ${context || "No context available."}\n\nQuestion: ${message}\nAnswer in ${language || 'Hinglish'}:`;
    const result = await model.invoke(prompt);

    return res.json({ reply: result.content });
  } catch (error) {
    console.error("Chat Error:", error);
    return res.status(500).json({ reply: "Connection failed", error: error.message });
  }
};