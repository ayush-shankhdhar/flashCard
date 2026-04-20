import { GoogleGenAI } from "@google/genai";
import { NextRequest } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");

interface GeneratedCardInput {
  question: string;
  answer: string;
  category?: string;
  difficulty?: string;
}

interface GeneratedCard {
  front: string;
  back: string;
  category: string;
  difficulty: string;
}

const VALID_CATEGORIES = new Set(["concept", "definition", "example", "relationship", "edge-case"]);
const VALID_DIFFICULTIES = new Set(["easy", "medium", "hard"]);

const SYSTEM_PROMPT = `You are an expert flashcard generator for spaced repetition learning systems.

Your task:
Convert the given text into deep, comprehensive flashcards that test true understanding — not just surface recall.

CARD TYPES TO GENERATE:
- "definition": Key term definitions (What is X?)
- "concept": Core concepts and how they work (How does X work? Why is X important?)
- "relationship": How concepts connect (How does X relate to Y? What is the difference between X and Y?)
- "example": Concrete examples and applications (Give an example of X. When would you use X?)
- "edge-case": Exceptions, gotchas, and boundary conditions (What happens when X fails? What is a common misconception about X?)

DIFFICULTY LEVELS:
- "easy": Basic recall of definitions and simple facts
- "medium": Understanding how something works, requires explanation
- "hard": Analysis, comparison, edge cases, requires deep understanding

STRICT RULES:
- Generate 10–15 flashcards per input.
- Each answer must be concise (max 25 words).
- Vary card types — aim for a mix of at least 3 different categories.
- Vary difficulty — include easy, medium, AND hard cards.
- Test understanding, not memorization of sentences.
- For relationships, compare/contrast related concepts.
- For edge cases, test boundary conditions and common mistakes.
- No duplicate questions. No fluff. No filler.

FORMAT:
Return JSON only. No explanation. No markdown.

[
  {
    "question": "Clear, specific question",
    "answer": "Concise, accurate answer",
    "category": "concept|definition|relationship|example|edge-case",
    "difficulty": "easy|medium|hard"
  }
]`;

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

function validateCard(card: unknown): card is GeneratedCardInput {
  if (typeof card !== "object" || card === null) return false;
  const c = card as Record<string, unknown>;
  return (
    typeof c.question === "string" &&
    c.question.length > 5 &&
    typeof c.answer === "string" &&
    c.answer.length > 3
  );
}

/**
 * Process chunks with concurrency limit to avoid rate-limiting.
 */
async function processChunksParallel(
  ai: GoogleGenAI,
  chunks: string[],
  maxConcurrent: number = 3
): Promise<GeneratedCard[]> {
  const allCards: GeneratedCard[] = [];
  
  // Process in batches of maxConcurrent
  for (let i = 0; i < chunks.length; i += maxConcurrent) {
    const batch = chunks.slice(i, i + maxConcurrent);
    const promises = batch.map(async (chunk) => {
      try {
        const response = await ai.models.generateContent({
          model: "gemma-4-31b-it",
          contents: `Here is the educational content to create flashcards from:\n\n---\n${chunk}\n---\n\nGenerate comprehensive, deep flashcards from this content. Include varied categories (definition, concept, relationship, example, edge-case) and varied difficulty levels.`,
          config: {
            systemInstruction: SYSTEM_PROMPT,
            temperature: 0.7,
            maxOutputTokens: 4096,
          },
        });

        const rawText = response.text ?? "";
        const cleaned = cleanJsonString(rawText);

        try {
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed)) {
            const cards: GeneratedCard[] = [];
            for (const card of parsed) {
              if (validateCard(card)) {
                cards.push({
                  front: card.question,
                  back: card.answer,
                  category: VALID_CATEGORIES.has(card.category ?? "") ? card.category! : "concept",
                  difficulty: VALID_DIFFICULTIES.has(card.difficulty ?? "") ? card.difficulty! : "medium",
                });
              }
            }
            return cards;
          }
        } catch {
          console.warn("Failed to parse chunk response as JSON, skipping chunk");
        }
      } catch (chunkError) {
        console.warn("Failed to generate for chunk, skipping:", chunkError);
      }
      return [] as GeneratedCard[];
    });

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === "fulfilled") {
        allCards.push(...result.value);
      }
    }
  }

  return allCards;
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

    const ai = new GoogleGenAI({ apiKey });

    // Fire summary generation IN PARALLEL with chunk processing
    const summaryPromise = (async () => {
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
        return {
          title: summary.title || null,
          description: summary.description || null,
        };
      } catch {
        return { title: null, description: null };
      }
    })();

    // Process all chunks with concurrency limit (max 3 parallel)
    const cardsPromise = processChunksParallel(ai, chunks, 3);

    // Await both in parallel
    const [allCards, summaryResult] = await Promise.all([cardsPromise, summaryPromise]);

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

    const deckName = summaryResult.title || file.name.replace(/\.pdf$/i, "");
    const deckDescription =
      summaryResult.description ||
      `${uniqueCards.length} flashcards generated from ${file.name}`;

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
