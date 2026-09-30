import { Injectable } from '@nestjs/common';
import { AiProviderService } from '../ai/ai-provider.service';

/**
 * LlmService — thin wrapper around AiProviderService.
 * Tính năng gọi tool (tool-calling) và streaming vẫn dùng Gemini trực tiếp
 * vì Ollama chưa hỗ trợ Gemini function-calling format.
 */
@Injectable()
export class LlmService {
  constructor(private readonly aiProvider: AiProviderService) {}

  async generate(
    prompt: string,
    options?: { temperature?: number; maxTokens?: number },
  ): Promise<string> {
    const result = await this.aiProvider.generate(prompt, options ?? {});
    return result ?? 'Xin lỗi, hệ thống AI tạm thời không khả dụng.';
  }

  async chatWithTools(messages: any[], tools: any[]) {
    const groqKey = process.env.GROQ_API_KEY;

    if (groqKey) {
      const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';

      // 1. Map tools sang định dạng OpenAI/Groq
      const groqTools = tools.map((t) => {
        const decl = t.functionDeclarations?.[0] || t.function || t;
        return {
          type: 'function',
          function: {
            name: decl.name,
            description: decl.description,
            parameters: decl.parameters,
          },
        };
      });

      // 2. Map messages sang OpenAI/Groq format
      const systemMsg = messages.find((m) => m.role === 'system');
      const conversationMsgs = messages.filter((m) => m.role !== 'system');

      let systemContent = systemMsg?.content || '';
      systemContent += '\n\nCRITICAL: You are an API backend. When you decide to call a function/tool, you MUST only generate the native function call JSON payload. Do NOT write any conversational text, explanations, thoughts, or custom XML tags like <function=...>. ONLY output the standard tool call.';

      const groqMessages = conversationMsgs.map((m) => ({
        role: m.role === 'model' || m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));

      groqMessages.unshift({
        role: 'system',
        content: systemContent,
      });

      try {
        console.log(`[GROQ TOOL CALL] Sending request to Llama 70B...`);
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model,
            messages: groqMessages,
            tools: groqTools,
            tool_choice: 'auto',
            temperature: 0.2, // Giảm thêm temperature để model tuân thủ cấu trúc tối đa
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq HTTP ${res.status}: ${errText}`);
        }

        const data = await res.json();
        const choice = data?.choices?.[0]?.message;

        const parts: any[] = [];
        if (choice?.tool_calls && choice.tool_calls.length > 0) {
          const tc = choice.tool_calls[0];
          let args = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {}
          parts.push({
            functionCall: {
              name: tc.function.name,
              args,
            },
          });
        } else if (choice?.content) {
          // CHỐT CHẶN: Nếu model tự sinh chuỗi JSON hoặc XML gọi tool trong phần content (do hành vi Llama 3)
          let parsedToolCall: any = null;
          const contentStr = choice.content.trim();

          if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
            try {
              const parsed = JSON.parse(contentStr);
              let funcName = parsed.function || parsed.name || parsed.functionCall?.name;
              let funcArgs = parsed.parameters || parsed.arguments || parsed.functionCall?.args || {};

              // CHỐT CHẶN KHẨN CẤP: Nếu model chỉ trả về { "query": "..." } mà không gói trong tên hàm
              if (!funcName && parsed.query) {
                const qLower = parsed.query.toLowerCase();
                // Nếu chứa từ khóa "giá", "bao nhiêu" hoặc là ký hiệu mã coin ngắn dưới 10 ký tự
                const isPriceQuery = qLower.includes('gia') || qLower.includes('bao nhieu') || /^[a-z0-9]{2,10}$/i.test(qLower.trim());
                funcName = isPriceQuery ? 'get_price' : 'search_knowledge';
                funcArgs = { query: parsed.query };
              }

              if (funcName === 'search_knowledge' || funcName === 'get_price') {
                parsedToolCall = {
                  functionCall: {
                    name: funcName,
                    args: typeof funcArgs === 'string' ? JSON.parse(funcArgs) : funcArgs,
                  },
                };
              }
            } catch {}
          } else {
            // Trường hợp XML hoặc văn bản thô chứa cuộc gọi hàm (e.g. <function=search_knowledge{"query": "..."}>)
            const searchMatch = contentStr.includes('search_knowledge');
            const priceMatch = contentStr.includes('get_price');

            if (searchMatch || priceMatch) {
              const name = searchMatch ? 'search_knowledge' : 'get_price';
              const jsonStart = contentStr.indexOf('{');
              const jsonEnd = contentStr.lastIndexOf('}');
              if (jsonStart !== -1 && jsonEnd !== -1) {
                try {
                  const args = JSON.parse(contentStr.slice(jsonStart, jsonEnd + 1));
                  parsedToolCall = {
                    functionCall: {
                      name,
                      args,
                    },
                  };
                } catch {}
              }
            }
          }

          if (parsedToolCall) {
            console.log('[GROQ TOOL CALL] Intercepted text tool-call successfully:', JSON.stringify(parsedToolCall));
            parts.push(parsedToolCall);
          } else {
            parts.push({
              text: choice.content,
            });
          }
        }

        // Tạo cấu trúc tương thích ngược với Gemini
        const geminiCompatData = {
          candidates: [
            {
              content: {
                parts,
              },
            },
          ],
        };

        console.log('GROQ COMPAT DATA:', JSON.stringify(geminiCompatData));
        return geminiCompatData;
      } catch (e: any) {
        console.warn(`[GROQ TOOL CALL] Failed, falling back to Gemini: ${e?.message}`);
      }
    }

    // ─────────────────────── GEMINI FALLBACK ────────────────────────
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) throw new Error('Neither GROQ_API_KEY nor GEMINI_API_KEY configured.');

    let geminiTools: any[];
    if (tools && tools.length > 0 && (tools[0] as any).functionDeclarations) {
      geminiTools = tools;
    } else {
      geminiTools = tools.map((t) => ({
        functionDeclarations: [
          {
            name: t.function?.name || t.name || '',
            description: t.function?.description || t.description || '',
            parameters: t.function?.parameters || t.parameters || {},
          },
        ],
      }));
    }

    const systemMsg = messages.find((m) => m.role === 'system');
    const conversationMsgs = messages.filter((m) => m.role !== 'system');

    const payload: any = {
      contents: conversationMsgs.map((m) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      })),
      tools: geminiTools,
    };

    if (systemMsg) {
      payload.systemInstruction = {
        parts: [{ text: systemMsg.content }],
      };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
    }

    const data = await res.json();
    console.log('GEMINI FALLBACK RESPONSE:', JSON.stringify(data).slice(0, 300));
    return data;
  }

  async generateWithTools(messages: any[], tools: any[]) {
    return this.chatWithTools(messages, tools);
  }

  async generateStream(prompt: string, onChunk: (text: string) => void) {
    // Streaming dùng Gemini trực tiếp
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      onChunk('Streaming không khả dụng (GEMINI_API_KEY chưa được cấu hình).');
      return;
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 800 },
        }),
      },
    );

    if (!res.body) throw new Error('No stream body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const json = line.replace('data: ', '').trim();
        if (!json || json === '[DONE]') continue;
        try {
          const parsed = JSON.parse(json);
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) onChunk(text);
        } catch {
          // ignore malformed SSE lines
        }
      }
    }
  }
}