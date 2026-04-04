/**
 * POST /api/ai/generate-description
 * Generates a property description using Google Gemini 1.5 Flash (free tier)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import gemini from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const { title, propertyType, location, amenities, distanceToCampus, genderPreference, annualRent } = body;

    const userMessage = [
      title ? `Title: ${title}` : null,
      propertyType ? `Property Type: ${propertyType}` : null,
      location ? `Location: ${location}` : null,
      distanceToCampus ? `Distance to Campus: ${distanceToCampus}` : null,
      genderPreference ? `Gender Preference: ${genderPreference}` : null,
      annualRent ? `Annual Rent: ₦${annualRent}` : null,
      amenities && Array.isArray(amenities) && amenities.length > 0
        ? `Amenities: ${amenities.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const model = gemini.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction:
        "You are a Nigerian student housing listing assistant. Write compelling, honest property descriptions for off-campus accommodation listings near Nigerian universities. Keep descriptions concise (3-4 sentences), factual, and friendly. Focus on what students care about: proximity to campus, utilities, security, and value for money. Write in simple, clear English. Do NOT make up details not provided.",
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 300 },
    });

    const description = result.response.text().trim();

    return NextResponse.json({ success: true, data: { description } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI GENERATE DESCRIPTION ERROR]", msg);
    return NextResponse.json(
      {
        success: false,
        error: !process.env.GOOGLE_AI_API_KEY
          ? "AI service is not configured. Add GOOGLE_AI_API_KEY to your environment variables."
          : "Failed to generate description. Please try again.",
      },
      { status: 500 },
    );
  }
}
