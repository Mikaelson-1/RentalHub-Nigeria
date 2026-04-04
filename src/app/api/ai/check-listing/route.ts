/**
 * POST /api/ai/check-listing
 * Detects potential scam/fraud signals in a property listing using Gemini 1.5 Flash (free tier)
 */

import { NextResponse } from "next/server";
import gemini from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: "title and description are required." },
        { status: 400 },
      );
    }

    const model = gemini.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction:
        'You are a fraud detection assistant for a Nigerian student housing platform. Analyze property listing text for scam signals commonly seen in Nigeria advance-fee fraud, particularly targeting students. Check for: urgency pressure ("pay now or lose it", "only today"), requests to pay via WhatsApp or personal bank transfer instead of platform, suspiciously low prices far below market rate for Nigerian student housing, promises that seem too good to be true, requests for advance payment before viewing, threats or emotional manipulation, unrealistic claims (mansion for ₦10k/month). Respond ONLY with valid JSON: { "flagged": boolean, "confidence": "low"|"medium"|"high", "reasons": string[] }. If not flagged, reasons should be empty array.',
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: `Title: ${title}\nDescription: ${description}` }] }],
      generationConfig: { maxOutputTokens: 300 },
    });

    const rawText = result.response.text();

    let parsed: { flagged: boolean; confidence: string; reasons: string[] };
    try {
      const clean = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { flagged: false, confidence: "low", reasons: [] };
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI CHECK LISTING ERROR]", msg);
    return NextResponse.json(
      {
        success: false,
        error: !process.env.GOOGLE_AI_API_KEY
          ? "AI service is not configured. Add GOOGLE_AI_API_KEY to your environment variables."
          : "Failed to check listing.",
      },
      { status: 500 },
    );
  }
}
