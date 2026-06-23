import dotenv from 'dotenv';

dotenv.config();

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'google/gemini-flash-1.5-exp';

type Answer = 'a' | 'b' | 'c' | 'd';

type AiQuestion = {
    question: string;
    options: Record<Answer, string>;
    correct: Answer;
    explanation: string;
};

type OpenRouterResponse = {
    choices?: Array<{
        message?: {
            content?: unknown;
        };
    }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

function isAnswer(value: unknown): value is Answer {
    return value === 'a' || value === 'b' || value === 'c' || value === 'd';
}

function validateAiQuestion(value: unknown): AiQuestion {
    if (!isRecord(value)) {
        throw new Error('OpenRouter response was not an object');
    }

    if (!isNonEmptyString(value.question)) {
        throw new Error('OpenRouter response missing question text');
    }

    if (!isRecord(value.options)) {
        throw new Error('OpenRouter response missing options');
    }

    const options = value.options;
    for (const answer of ['a', 'b', 'c', 'd'] as Answer[]) {
        if (!isNonEmptyString(options[answer])) {
            throw new Error(`OpenRouter response missing option ${answer.toUpperCase()}`);
        }
    }

    if (!isAnswer(value.correct)) {
        throw new Error('OpenRouter response missing a valid correct answer');
    }

    if (!isNonEmptyString(value.explanation)) {
        throw new Error('OpenRouter response missing explanation');
    }

    return {
        question: value.question,
        options: {
            a: options.a as string,
            b: options.b as string,
            c: options.c as string,
            d: options.d as string,
        },
        correct: value.correct,
        explanation: value.explanation,
    };
}

export async function generateAIQuestion(topic: string): Promise<AiQuestion> {
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is required for broadcast trivia');
    }

    const prompt = `Generate a technical multiple-choice question (MCQ) about ${topic} for 1st and 2nd year college computer science students.

Requirements:
1. The question should be challenging but fair.
2. Provide 4 options (a, b, c, d).
3. Provide a clear, concise explanation for the correct answer.
4. Return the response strictly in JSON format. Do not include any markdown formatting, code blocks, or conversational text.

JSON Format:
{
  "question": "The question text here",
  "options": {
    "a": "Option A text",
    "b": "Option B text",
    "c": "Option C text",
    "d": "Option D text"
  },
  "correct": "a",
  "explanation": "Detailed explanation of why 'a' is correct."
}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'NYC Quizzer Bot',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        }),
    });

    if (!response.ok) {
        throw new Error(`OpenRouter request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!isNonEmptyString(content)) {
        throw new Error('OpenRouter response did not include question content');
    }

    const jsonContent = content.replace(/```json|```/g, '').trim();

    try {
        return validateAiQuestion(JSON.parse(jsonContent));
    } catch (error) {
        throw new Error('OpenRouter response was not a valid trivia question', { cause: error });
    }
}
