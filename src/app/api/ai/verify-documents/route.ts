/**
 * POST /api/ai/verify-documents
 * AI pre-screener for landlord verification submissions. Requires ADMIN role.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import gemini from "@/lib/gemini";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin access required." }, { status: 403 });
    }

    const { userId } = await request.json();
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        governmentIdUrl: true,
        selfieUrl: true,
        ownershipProofUrl: true,
        isDirectOwner: true,
        landlordAware: true,
        phoneNumber: true,
      },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const submissionSummary = [
      `Government ID uploaded: ${user.governmentIdUrl ? "Yes" : "No"}`,
      `Selfie uploaded: ${user.selfieUrl ? "Yes" : "No"}`,
      `Ownership proof uploaded: ${user.ownershipProofUrl ? "Yes" : "No"}`,
      `Is direct owner: ${user.isDirectOwner === true ? "Yes" : user.isDirectOwner === false ? "No (acting on landlord's behalf)" : "Not declared"}`,
      `Landlord aware of listing: ${user.landlordAware === true ? "Yes" : user.landlordAware === false ? "No" : "Not applicable"}`,
      `Phone number provided: ${user.phoneNumber ? "Yes" : "No"}`,
    ].join("\n");

    const model = gemini.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction:
        'You are a verification pre-screener for a Nigerian student housing platform. You assess landlord verification submissions based on the documents provided and declarations made. You cannot view the actual documents (they will be reviewed by a human admin), but you assess the overall completeness and risk profile of the submission. Respond ONLY with valid JSON: { "score": "PASS"|"REVIEW"|"FAIL", "note": string }. PASS = all required documents present, declarations consistent. REVIEW = documents present but some declarations need human attention. FAIL = missing critical documents or contradictory declarations.',
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: submissionSummary }] }],
      generationConfig: { maxOutputTokens: 200 },
    });

    const rawText = result.response.text();

    let parsed: { score: string; note: string };
    try {
      const clean = rawText.replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { score: "REVIEW", note: "Could not parse AI response. Manual review required." };
    }

    // Save AI pre-screen result to the user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        aiPreScreenScore: parsed.score,
        aiPreScreenNote: parsed.note,
      },
    });

    return NextResponse.json({ success: true, data: { score: parsed.score, note: parsed.note } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI VERIFY DOCUMENTS ERROR]", msg);
    return NextResponse.json(
      {
        success: false,
        error: !process.env.GOOGLE_AI_API_KEY
          ? "AI service is not configured. Add GOOGLE_AI_API_KEY to your environment variables."
          : "Failed to pre-screen verification.",
      },
      { status: 500 },
    );
  }
}
