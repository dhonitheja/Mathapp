import { NextResponse } from 'next/server';
import { adjustDifficulty } from '@/lib/difficultyEngine';
import { generateQuestion } from '@/lib/questionGenerator';
import { GoogleGenerativeAI } from "@google/generative-ai";
import crypto from 'crypto';
import { supabase } from '@/lib/supabase';

export async function GET() {
    return NextResponse.json({ message: 'Agent API is reliable and ready.' });
}

export async function POST(request: Request) {
    let inputs;
    try {
        inputs = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
        classLevel,
        topic,
        previousPerformance,
        currentDifficulty,
        previousHashes,
        questionData, // Optional: If provided, explains it (future use), currently mainly generating
        // New fields for stat updates
        updateStats,
        studentName,
        isCorrect
    } = inputs;

    // --- LOGIC 1: Update Stats (if requested) ---
    if (updateStats) {
        if (!studentName) {
            return NextResponse.json({ error: 'Missing studentName' }, { status: 400 });
        }

        try {
            // Check if student exists
            const { data: existingUser } = await supabase
                .from('students')
                .select('*')
                .eq('name', studentName)
                .single();

            if (existingUser) {
                // Update existing
                await supabase
                    .from('students')
                    .update({
                        total_attempted: existingUser.total_attempted + 1,
                        total_correct: existingUser.total_correct + (isCorrect ? 1 : 0),
                        // Optionally update classLevel if it changed, currently keeping static
                    })
                    .eq('id', existingUser.id);
            } else {
                // Create new
                await supabase
                    .from('students')
                    .insert({
                        name: studentName,
                        classLevel: classLevel || 1, // Default to 1 if not provided
                        total_attempted: 1,
                        total_correct: isCorrect ? 1 : 0
                    });
            }

            return NextResponse.json({ success: true, message: 'Stats updated' });

        } catch (error) {
            console.error("Supabase Error:", error);
            // Return 200 even if DB fails to not break the frontend flow, but log it.
            // Or return 500. Let's return 200 with error warning.
            return NextResponse.json({ success: false, error: 'Database update failed' });
        }
    }

    // --- LOGIC 2: Generate Question (Standard Flow) ---

    // Validate essential inputs
    if (!classLevel || !topic) {
        // If we are just updating stats, classLevel/topic might be missing, but we handled updateStats above.
        // So here we are definitely generating a question.
        return NextResponse.json(
            { error: 'Missing classLevel or topic' },
            { status: 400 }
        );
    }

    // 1. Adjust Difficulty
    const difficultyLevel = currentDifficulty || 'Medium';
    const adjustedDifficulty = previousPerformance
        ? adjustDifficulty(previousPerformance, difficultyLevel)
        : difficultyLevel;

    // Define fallback function using rule-based generator
    const generateFallback = () => {
        console.log("Using rule-based fallback generator.");
        return generateQuestion(classLevel, topic, adjustedDifficulty, previousHashes || []);
    };

    // Helper to generate hash for Gemini content since it doesn't come with one
    const generateHash = (text: string) => {
        return crypto.createHash('sha256').update(text).digest('hex');
    };

    let finalQuestionData;

    // 2. Try Gemini Generation
    const apiKey = process.env.GOOGLE_API_KEY;
    if (apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const prompt = `
                Generate a unique multiple-choice math question.
                Target: Class ${classLevel}, Topic: "${topic}", Difficulty: ${adjustedDifficulty}.
                
                Requirements:
                - Return strictly valid JSON.
                - No markdown formatting (like \`\`\`json).
                - Keys must be: "question", "options" (array of 4 strings), "correctAnswer" (string matches one option exactly), "explanation" (step-by-step logic).
                - Ensure the question is solvable and has exactly one correct answer in the options.
                - VARY the question structure. Do not just change numbers.
            `;

            const result = await model.generateContent(prompt);
            const responseText = result.response.text();

            // Clean response (remove markdown if present)
            const cleanJsonStart = responseText.indexOf('{');
            const cleanJsonEnd = responseText.lastIndexOf('}') + 1;

            if (cleanJsonStart === -1 || cleanJsonEnd === -1) {
                throw new Error("Invalid JSON structure in Gemini response");
            }

            const jsonString = responseText.substring(cleanJsonStart, cleanJsonEnd);
            const geminiData = JSON.parse(jsonString);

            // Validate schema
            if (!geminiData.question || !Array.isArray(geminiData.options) || !geminiData.correctAnswer || !geminiData.explanation) {
                throw new Error("Gemini response missing required keys");
            }

            // Check against previous hashes to avoid duplicate generated content (unlikely, but good practice)
            const newHash = generateHash(geminiData.question);
            if (previousHashes && previousHashes.includes(newHash)) {
                // If duplicate, fallback (simplest retry mechanism for now)
                throw new Error("Duplicate content generated");
            }

            finalQuestionData = {
                ...geminiData,
                hash: newHash
            };

        } catch (error) {
            console.error("Gemini generation failed:", error);
            // Fallback to rule-based
            finalQuestionData = generateFallback();
        }
    } else {
        // No API Key, use fallback
        finalQuestionData = generateFallback();
    }

    return NextResponse.json({
        ...finalQuestionData,
        difficulty: adjustedDifficulty,
        topic
    });
}
