import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // AI Client helper
  const getAi = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({ apiKey });
  };

  // API Route: AI Test Paper Generation
  app.post("/api/generate-test", async (req, res) => {
    try {
      const { subject, classLevel, chapter, totalMarks, difficulty } = req.body;
      const ai = getAi();
      
      if (!ai) {
        return res.json({ success: false, reason: "NO_API_KEY" });
      }

      const prompt = `You are a top CBSE Class 9 & 10 Board Exam Paper Creator for ${subject}.
Generate an official-style CBSE Competency Test Paper matching these parameters:
- Subject: ${subject}
- Class: ${classLevel}
- Scope/Chapter: ${chapter || "Full Syllabus"}
- Total Marks: ${totalMarks || 20}
- Difficulty: ${difficulty || "Board Standard"}

Requirements:
- Questions must be CBSE competency-aligned with real-world scenarios, MCQs, Assertion-Reason, and Short/Case-based questions.
- Return strictly valid JSON with no markdown formatting surrounding it if possible, matching this schema:
{
  "testTitle": "CBSE Class ${classLevel} ${subject} ${difficulty} Competency Test",
  "totalMarks": ${totalMarks || 20},
  "durationMinutes": ${Math.min(180, Math.max(15, (totalMarks || 20) * 2))},
  "instructions": [
    "Read all questions carefully.",
    "Section A contains 1-mark MCQs and Assertion-Reason items.",
    "Section B contains multi-mark subjective and case-based questions."
  ],
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "section": "Section A",
      "marks": 1,
      "question": "Question string",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option A",
      "explanation": "Detailed explanation based on NCERT concept",
      "hint": "Useful conceptual hint"
    },
    {
      "id": "q2",
      "type": "short",
      "section": "Section B",
      "marks": 3,
      "question": "Subjective numerical or reasoning question",
      "sampleAnswer": "Step-by-step marking scheme solution",
      "explanation": "NCERT key points required for full marks"
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, test: parsed });
    } catch (err: any) {
      console.error("Error generating test with Gemini:", err);
      res.json({ success: false, error: err.message || "Failed to generate test with AI" });
    }
  });

  // API Route: AI Test Grading & Feedback
  app.post("/api/grade-test", async (req, res) => {
    try {
      const { test, userAnswers } = req.body;
      const ai = getAi();
      
      if (!ai) {
        return res.json({ success: false, reason: "NO_API_KEY" });
      }

      const prompt = `You are a strict, fair CBSE Board Exam Examiner grading a student's test submission.
Test Title: ${test.title || test.testTitle || 'CBSE Exam'}
Subject: ${test.subject || 'General'}
Class: ${test.classLevel || '10'}
Questions & Student Submissions:
${JSON.stringify({ questions: test.questions, userAnswers }, null, 2)}

STRICT GRADING RULES:
1. For MCQ questions: Compare the student's submitted answer ("userAnswers[questionId]") with the question's "correctAnswer".
   - If the student's answer matches the correct answer: award full marks (scoreObtained = maxMarks).
   - If the student's answer is incorrect, wrong, or blank: award 0 marks (scoreObtained = 0). DO NOT award partial marks for incorrect MCQ choices.
2. For Short Answer / Case Study questions:
   - Evaluate accuracy against CBSE NCERT standard criteria and sample solution.
   - If the answer is completely incorrect, wrong, unattempted, or irrelevant: award 0 marks (scoreObtained = 0).
   - If partially correct with some missing NCERT keywords: award partial marks proportional to accuracy.
   - If complete and accurate: award full marks.

Return strictly valid JSON matching this schema:
{
  "evaluations": [
    {
      "questionId": "q1",
      "isCorrect": true,
      "scoreObtained": 1,
      "maxMarks": 1,
      "userAnswer": "Option selected or typed text",
      "correctAnswer": "Correct answer / model answer",
      "feedback": "Clear explanation of why marks were awarded or deducted"
    }
  ],
  "totalScore": 15,
  "maxScore": 20,
  "overallFeedback": "Constructive, realistic evaluation highlighting areas to fix",
  "strengths": ["Topics answered correctly"],
  "weaknesses": ["Topics/questions answered incorrectly"],
  "studyTips": ["Actionable study advice based on missed questions"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, result: parsed });
    } catch (err: any) {
      console.error("Error grading test with Gemini:", err);
      res.json({ success: false, error: err.message || "Failed to grade test with AI" });
    }
  });

  // API Route: Feynman AI Explainer Diagnostic
  app.post("/api/feynman", async (req, res) => {
    try {
      const { topic, userExplanation, subject, classLevel } = req.body;
      const ai = getAi();
      
      if (!ai) {
        return res.json({ success: false, reason: "NO_API_KEY" });
      }

      const prompt = `You are an expert Feynman Technique AI Tutor for CBSE Class ${classLevel || '10'} ${subject || 'Science / Mathematics'}.
The student is explaining the topic: "${topic}".
Student's Explanation:
"${userExplanation}"

Analyze their explanation using the Feynman Technique principles (clarity, simplicity, detection of missing key terms, and identifying misconceptions).
Return strictly valid JSON matching this schema:
{
  "clarityScore": 85,
  "summary": "Clear, encouraging evaluation of the student's explanation",
  "keyTermsFound": ["Key NCERT term 1", "Key NCERT term 2"],
  "missingTerms": ["Essential term missed 1", "Essential term missed 2"],
  "misconceptions": ["Inaccuracy if any, or 'None found'"],
  "simplifiedExplanation": "The ideal, simple 2-3 sentence Feynman explanation for this concept",
  "ncertTip": "Specific board exam tip for full marks on this question"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      res.json({ success: true, analysis: parsed });
    } catch (err: any) {
      console.error("Error running Feynman analysis with Gemini:", err);
      res.json({ success: false, error: err.message || "Failed to run Feynman analysis" });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
