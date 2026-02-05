import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import crypto from "crypto";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const responseSchema = z.object({
  response: z.string(),
  thinking: z.string(),
  user_mood: z.enum([
    "positive",
    "neutral",
    "negative",
    "curious",
    "frustrated",
    "confused",
  ]),
  suggested_questions: z.array(z.string()),
  debug: z.object({
    context_used: z.boolean(),
  }),
  matched_categories: z.array(z.string()).optional(),
  redirect_to_agent: z
    .object({
      should_redirect: z.boolean(),
      reason: z.string().optional(),
    })
    .optional(),
});

function sanitizeAndParseJSON(jsonString: string) {
  const sanitized = jsonString.replace(
    /(?<=:\s*")(.|\n)*?(?=")/g,
    (match) => match.replace(/\n/g, "\\n")
  );
  try {
    return JSON.parse(sanitized);
  } catch (parseError) {
    console.error("Error parsing JSON response:", parseError);
    throw new Error("Invalid JSON response from AI");
  }
}

const DEFAULT_SYSTEM_PROMPT = `Ты — AI агент службы поддержки. Ты помогаешь пользователям, отвечая на их вопросы по продуктам и услугам компании. Отвечай вежливо, кратко и по делу.

Если не можешь помочь пользователю или если пользователь просит связаться с живым оператором, перенаправь его на агента.`;

export async function POST(req: Request) {
  const {
    messages,
    model,
    systemPrompt,
    temperature,
    maxTokens,
    enableCategories,
    enableMoodDetection,
    enableRedirectToAgent,
    enableSuggestedQuestions,
    categories,
  } = await req.json();

  const latestMessage = messages[messages.length - 1].content;

  const categoriesContext =
    enableCategories !== false && categories && categories.length > 0
      ? `
    Категоризируй обращение пользователя. Доступные категории: ${categories.map((c: any) => c.id).join(", ")}.
    Если обращение подходит под несколько категорий, укажи все. Если ни одна не подходит — оставь массив пустым.
  `
      : "";

  const moodContext =
    enableMoodDetection !== false
      ? `Определи настроение пользователя: positive, neutral, negative, curious, frustrated, confused.`
      : `Всегда ставь user_mood: "neutral".`;

  const redirectContext =
    enableRedirectToAgent !== false
      ? `Если не можешь помочь или пользователь просит оператора — установи redirect_to_agent.should_redirect: true с причиной.`
      : `Всегда ставь redirect_to_agent.should_redirect: false.`;

  const suggestionsContext =
    enableSuggestedQuestions !== false
      ? `Предложи 2-3 релевантных вопроса, которые пользователь мог бы задать.`
      : `Оставь массив suggested_questions пустым.`;

  const fullSystemPrompt = `${systemPrompt || DEFAULT_SYSTEM_PROMPT}

${moodContext}
${categoriesContext}
${redirectContext}
${suggestionsContext}

Формат ответа — строго JSON:
{
  "thinking": "Краткое объяснение хода рассуждений",
  "response": "Твой ответ пользователю",
  "user_mood": "positive|neutral|negative|curious|frustrated|confused",
  "suggested_questions": ["Вопрос 1?", "Вопрос 2?"],
  "debug": { "context_used": false },
  ${enableCategories !== false ? '"matched_categories": ["category_id"],' : ""}
  "redirect_to_agent": { "should_redirect": false, "reason": "" }
}`;

  try {
    const anthropicMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    anthropicMessages.push({
      role: "assistant",
      content: "{",
    });

    const response = await anthropic.messages.create({
      model: model || "claude-sonnet-4-20250514",
      max_tokens: maxTokens || 1000,
      messages: anthropicMessages,
      system: fullSystemPrompt,
      temperature: temperature ?? 0.3,
    });

    const textContent =
      "{" +
      response.content
        .filter(
          (block): block is Anthropic.TextBlock => block.type === "text"
        )
        .map((block) => block.text)
        .join(" ");

    let parsedResponse;
    try {
      parsedResponse = sanitizeAndParseJSON(textContent);
    } catch {
      throw new Error("Invalid JSON response from AI");
    }

    const validatedResponse = responseSchema.parse(parsedResponse);

    const responseWithId = {
      id: crypto.randomUUID(),
      ...validatedResponse,
    };

    return new Response(JSON.stringify(responseWithId), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in message generation:", error);
    const errorResponse = {
      id: crypto.randomUUID(),
      response:
        "Произошла ошибка при обработке запроса. Проверьте API ключ и повторите попытку.",
      thinking: "Error occurred during message generation.",
      user_mood: "neutral" as const,
      suggested_questions: [],
      debug: { context_used: false },
      matched_categories: [],
      redirect_to_agent: { should_redirect: false, reason: "" },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
