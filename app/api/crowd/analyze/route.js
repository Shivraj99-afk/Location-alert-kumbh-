import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
    try {
        const { image } = await req.json(); // base64 image data

        if (!image) {
            return NextResponse.json({ error: "No image provided" }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

        const prompt = `Analyze this image of a crowd and determine the density level. 
        Respond with exactly ONE word from this list: "LOW", "MEDIUM", or "HIGH".
        - "LOW": Very few people, plenty of space to move.
        - "MEDIUM": Moderate number of people, movement starts to slow down but still comfortable.
        - "HIGH": Dense crowd, shoulder to shoulder, movement is difficult.
        If the image does not show a crowd or is unclear, default to "LOW".`;

        // The image data is base64, need to strip the prefix if it exists
        const base64Data = image.split(",")[1] || image;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: "image/jpeg",
                },
            },
        ]);

        const response = await result.response;
        const text = response.text().trim().toUpperCase();

        // Validate response
        const validLevels = ["LOW", "MEDIUM", "HIGH"];
        const level = validLevels.includes(text) ? text : "LOW";

        // Map back to our system levels (1=Low, 2=Med, 3=High)
        const levelMap = { "LOW": 1, "MEDIUM": 2, "HIGH": 3 };

        return NextResponse.json({
            success: true,
            level: levelMap[level],
            label: level
        });

    } catch (err) {
        console.error("Gemini Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
