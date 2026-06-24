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

export async function generateAIQuestion(topic: string, style: 'quick' | 'deep' = 'quick'): Promise<AiQuestion> {
    const questions = await generateAIQuestions(topic, 1, style);
    return questions[0];
}

export async function generateAIQuestions(topic: string, count: number, style: 'quick' | 'deep' = 'quick', retryCount = 0): Promise<AiQuestion[]> {
    const apiKey = OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY is required for broadcast trivia');
    }

    const isQuick = style === 'quick';
    const prompt = isQuick 
        ? `Generate exactly ${count} concise, interview-style multiple-choice questions (MCQs) about ${topic} for CS students.
Return ONLY a JSON array of objects. No conversational text.

Format:
[
  {
    "question": "...",
    "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
    "correct": "a",
    "explanation": "..."
  }
]`
        : `Generate exactly ${count} complex, scenario-based technical challenges about ${topic} for advanced CS students.
Return ONLY a JSON array of objects. No conversational text.

Format:
[
  {
    "question": "...",
    "options": { "a": "...", "b": "...", "c": "...", "d": "..." },
    "correct": "a",
    "explanation": "..."
  }
]`;

    try {
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
                response_format: { type: 'json_object' } 
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

        const jsonContent = content.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();

        let cleanedContent = jsonContent;
        const firstBracket = jsonContent.indexOf('[');
        const lastBracket = jsonContent.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            cleanedContent = jsonContent.substring(firstBracket, lastBracket + 1);
        }

        const parsed = JSON.parse(cleanedContent);
        const arrayData = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || [parsed]);
        
        if (!Array.isArray(arrayData) || arrayData.length < count) {
            if (retryCount < 1) {
                return generateAIQuestions(topic, count, style, retryCount + 1);
            }
            throw new Error(`Insufficient questions generated (${arrayData?.length || 0}/${count})`);
        }

        return arrayData.map(q => {
            const validated = validateAiQuestion(q);
            return {
                question: validated.question,
                option_a: validated.options.a,
                option_b: validated.options.b,
                option_c: validated.options.c,
                option_d: validated.options.d,
                correct: validated.correct,
                explanation: validated.explanation,
            };
        });
    } catch (error) {
        if (retryCount < 1) {
            console.log(`AI generation failed for ${topic}, retrying once...`);
            return generateAIQuestions(topic, count, style, retryCount + 1);
        }
        console.error('AI Generator failed after retry:', error);
        throw error;
    }
}
