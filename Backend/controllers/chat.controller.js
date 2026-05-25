const { PineconeStore } = require("@langchain/pinecone");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { getPineconeIndex } = require("../config/pinecone");

let GoogleGenAIEmbeddings = null;
let ChatGoogleGenAI = null;

const initLangchainModules = async () => {
  if (!GoogleGenAIEmbeddings || !ChatGoogleGenAI) {
    const googleGenAIMod = await import("@langchain/google-genai");
    GoogleGenAIEmbeddings = googleGenAIMod.GoogleGenAIEmbeddings;
    ChatGoogleGenAI = googleGenAIMod.ChatGoogleGenAI;
  }
  
  return {
    embeddings: new GoogleGenAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "text-embedding-004", 
    }),
    ChatGoogleGenAI
  };
};

exports.uploadDocument = async (req, res) => {
  const pineconeIndex = getPineconeIndex();
  try {
    const userId = req.user?.userid;
    const { sessionId } = req.body;

    if (!userId) return res.status(401).json({ msg: "User not authenticated" });
    if (!sessionId) return res.status(400).json({ msg: "Missing sessionId" });
    if (!req.file) return res.status(400).json({ msg: "No file uploaded" });

    const { embeddings } = await initLangchainModules();

    const fileBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(fileBuffer);
    const extractedText = pdfData.text;

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
        source: req.file.originalname
      },
    }));

    await PineconeStore.fromDocuments(docs, embeddings, {
      pineconeIndex,
      maxConcurrency: 5,
    });

    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(200).json({
      msg: "PDF embeddings saved successfully in Pinecone"
    });

  } catch (error) {
    console.error("Error in uploadDocument:", error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({
      msg: "Pinecone ingestion failed",
      error: error.message
    });
  }
};

exports.askQuestion = async (req, res) => {
  const pineconeIndex = getPineconeIndex();
  try {
    const userId = req.user?.userid;
    const {
      sessionId,
      message,
      language = "english",
      focusMode,
      replyType = "Concise"
    } = req.body;

    if (!userId) return res.status(401).json({ msg: "User not authenticated" });
    if (!sessionId || !message) return res.status(400).json({ msg: "Missing sessionId or message" });

    // Ensure modules are loaded
    const { embeddings, ChatGoogleGenAI } = await initLangchainModules();

    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, { pineconeIndex });

    const retriever = vectorStore.asRetriever({
      k: 4,
      filter: { sessionId: { $eq: sessionId } } 
    });

    const relevantDocs = await retriever.invoke(message);

    const contextText = relevantDocs
      .map((d) => d.pageContent)
      .join("\n\n");

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

Do NOT use external knowledge fallback strings.

--- DOCUMENT CONTEXT START ---
${contextText || "No matching context found for this session."}
--- DOCUMENT CONTEXT END ---
`;

    const model = new ChatGoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      modelName: "gemini-2.5-flash",
      temperature: 0.1,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE }
      ]
    });

    const tokenMap = (type) => {
      const normalized = type.toLowerCase();
      if (normalized.includes("short")) return 900;
      if (normalized.includes("balanced")) return 1400;
      if (normalized.includes("detailed")) return 2500;
      return 1800;
    };

    const result = await model.invoke(
      [
        { role: "system", content: systemInstruction },
        { role: "user", content: message }
      ],
      { maxOutputTokens: tokenMap(replyType) }
    );

    return res.json({
      reply: result.content
    });

  } catch (error) {
    console.error("Error in askQuestion RAG:", error);
    return res.status(500).json({
      reply: "Sorry, vector DB query failed.",
      error: error.message
    });
  }
};