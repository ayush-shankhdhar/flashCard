import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

interface GeneratedCard {
  front: string;
  back: string;
  category: string;
  difficulty: string;
}

const SYSTEM_PROMPT = `You are an expert educator creating comprehensive flashcards for deep learning and long-term retention. Given a section of educational content, generate flashcards that cover:

1. KEY CONCEPTS — Core ideas that form the backbone of understanding
2. DEFINITIONS — Precise definitions of important terms
3. RELATIONSHIPS — How concepts connect, compare, or contrast
4. WORKED EXAMPLES — Step-by-step problem solutions or concrete examples
5. EDGE CASES — Common misconceptions, exceptions, or tricky details

Rules:
- Each card should test ONE specific piece of knowledge
- Questions should require ACTIVE RECALL, not just recognition
- Answers should be concise but complete (2-4 sentences max)
- Vary question formats: "What is...", "Why does...", "How does X relate to Y...", "What would happen if...", "Explain the difference between..."
- Assign each card a category: one of "concept", "definition", "relationship", "example", "edge-case"
- Assign each card a difficulty: one of "easy", "medium", "hard"
- Generate 12–20 high-quality cards per chunk of content
- Make cards that feel like they were written by a great teacher — clear, precise, thought-provoking

Respond ONLY with a valid JSON array. Each item must have exactly these fields:
{ "front": "question text", "back": "answer text", "category": "concept|definition|relationship|example|edge-case", "difficulty": "easy|medium|hard" }

Do NOT include any markdown, code fences, or extra text. Only the JSON array.`;

function chunkText(text: string, chunkSize: number = 3000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = end - overlap;
  }
  return chunks;
}

function cleanJsonString(raw: string): string {
  let s = raw.trim();
  // Remove markdown code fences if present
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  return s.trim();
}

const VALID_CATEGORIES = new Set(["concept", "definition", "relationship", "example", "edge-case"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

function validateCard(card: GeneratedCard): boolean {
  return (
    typeof card.front === "string" &&
    card.front.length > 5 &&
    typeof card.back === "string" &&
    card.back.length > 3 &&
    VALID_CATEGORIES.has(card.category) &&
    VALID_DIFFICULTIES.has(card.difficulty)
  );
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "your_api_key_here") {
      return Response.json(
        { error: "GEMINI_API_KEY is not configured. Please add your API key to .env.local" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return Response.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return Response.json({ error: "File must be a PDF" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return Response.json({ error: "File too large. Maximum 20MB." }, { status: 400 });
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length < 50) {
      return Response.json(
        { error: "Could not extract enough text from the PDF. Make sure it contains selectable text." },
        { status: 400 }
      );
    }

    // Chunk the text
    const chunks = chunkText(fullText);

    // Generate flashcards for each chunk using Gemma 4 31B IT
    const ai = new GoogleGenAI({ apiKey });
    const allCards: GeneratedCard[] = [];

    for (const chunk of chunks) {
      try {
        const response = await ai.models.generateContent({
          model: "gemma-4-31b-it",
          contents: `Here is the educational content to create flashcards from:\n\n---\n${chunk}\n---\n\nGenerate comprehensive flashcards from this content.`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        });

        const rawText = response.text ?? "";
        const cleaned = cleanJsonString(rawText);

        try {
          const parsed = JSON.parse(cleaned) as GeneratedCard[];
          if (Array.isArray(parsed)) {
            for (const card of parsed) {
              if (validateCard(card)) {
                allCards.push(card);
              }
            }
          }
        } catch {
          console.warn("Failed to parse chunk response as JSON, skipping chunk");
        }
      } catch (chunkError) {
        console.warn("Failed to generate for chunk, skipping:", chunkError);
      }
    }

    if (allCards.length === 0) {
      return Response.json(
        { error: "Failed to generate any flashcards. The PDF content may not be suitable." },
        { status: 500 }
      );
    }

    // Deduplicate by front text (case-insensitive)
    const seen = new Set<string>();
    const uniqueCards = allCards.filter((card) => {
      const key = card.front.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Generate a summary/name from the first chunk
    let deckName = file.name.replace(/\.pdf$/i, "");
    let deckDescription = "";

    try {
      const summaryResponse = await ai.models.generateContent({
        model: "gemma-4-31b-it",
        contents: `Based on this text, provide a short title (max 6 words) and a one-sentence description for a flashcard deck. Text:\n\n${fullText.slice(0, 1500)}\n\nRespond ONLY with JSON: { "title": "...", "description": "..." }`,
        config: {
          temperature: 0.3,
          maxOutputTokens: 200,
        },
      });

      const summaryText = cleanJsonString(summaryResponse.text ?? "");
      const summary = JSON.parse(summaryText);
      if (summary.title) deckName = summary.title;
      if (summary.description) deckDescription = summary.description;
    } catch {
      deckDescription = `${uniqueCards.length} flashcards generated from ${file.name}`;
    }

    return Response.json({
      name: deckName,
      description: deckDescription,
      sourceFileName: file.name,
      cards: uniqueCards,
    });
  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json(
      { error: "An unexpected error occurred while processing the PDF." },
      { status: 500 }
    );
  }
}
