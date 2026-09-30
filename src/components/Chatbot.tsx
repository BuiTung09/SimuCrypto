import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Bot, Minimize2, AlertCircle } from 'lucide-react';

const API_BASE = '';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isError?: boolean;
}

/**
 * Call the NestJS backend chat API.
 * Tries the streaming endpoint first; falls back to the regular endpoint.
 */
async function fetchBotReply(userMessage: string): Promise<string> {
  // Try streaming endpoint
  try {
    const res = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No stream reader');

    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      // SSE format: "data: <text>\n\n"
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          result += data.replace(/\\n/g, '\n');
        }
      }
    }

    if (result.trim()) return result.trim();
  } catch {
    // Streaming failed, try regular endpoint
  }

  // Fallback: regular (non-stream) endpoint
  try {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMessage }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    return data.reply || 'Không nhận được phản hồi từ server.';
  } catch {
    throw new Error('Không thể kết nối đến server AI. Hãy đảm bảo server đang chạy tại localhost:3000.');
  }
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      text: 'Xin chào! Tôi là SimuCryto AI — trợ lý thông minh của bạn. Tôi có thể giúp bạn tra giá coin, giải đáp kiến thức crypto và nhiều hơn nữa. Hỏi tôi bất cứ điều gì!',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || isTyping) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now(),
      text,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      const reply = await fetchBotReply(text);
      const botMsg: Message = {
        id: Date.now() + 1,
        text: reply,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: Date.now() + 1,
        text: err.message || 'Đã xảy ra lỗi. Vui lòng thử lại.',
        sender: 'bot',
        timestamp: new Date(),
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [inputValue, isTyping]);

  const quickQuestions = [
    'Giá Bitcoin hiện tại?',
    'Blockchain là gì?',
    'Cách giao dịch coin',
    'Ethereum là gì?',
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#559DD2] text-black shadow-lg transition-transform hover:scale-110"
        style={{ boxShadow: '0 4px 24px rgba(158,236,55,0.35)' }}
      >
        <Bot className="h-7 w-7" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl shadow-2xl transition-all ${
        isMinimized ? 'h-16 w-80' : 'h-[600px] w-96'
      }`}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between rounded-t-2xl p-4"
        style={{ background: '#559DD2', borderBottom: '1px solid rgba(0,0,0,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/10">
            <Bot className="h-6 w-6 text-black" />
          </div>
          <div>
            <div className="font-bold text-black">SimuCryto AI</div>
            <div className="text-xs text-black/70 flex items-center gap-1">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#166534', display: 'inline-block' }} />
              Trợ lý AI
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black transition-colors hover:bg-black/10"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-black transition-colors hover:bg-black/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4" style={{ background: 'var(--background)' }}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-2"
                    style={{
                      background:
                        message.sender === 'user'
                          ? '#559DD2'
                          : message.isError
                            ? 'rgba(239,68,68,0.1)'
                            : 'var(--secondary)',
                      color: message.sender === 'user' ? '#000' : 'var(--foreground)',
                      border: message.isError ? '1px solid rgba(239,68,68,0.3)' : 'none',
                    }}
                  >
                    {message.isError && (
                      <div className="flex items-center gap-1 mb-1" style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>
                        <AlertCircle size={12} /> Lỗi kết nối
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{message.text}</p>
                    <div
                      className="mt-1 text-xs"
                      style={{ opacity: 0.5 }}
                    >
                      {message.timestamp.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div
                    className="max-w-[80%] rounded-2xl px-4 py-3"
                    style={{ background: 'var(--secondary)' }}
                  >
                    <div className="flex gap-1.5 items-center">
                      <div className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--foreground)', opacity: 0.4, animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--foreground)', opacity: 0.4, animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full" style={{ background: 'var(--foreground)', opacity: 0.4, animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Questions */}
          {messages.length === 1 && (
            <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="mb-2 text-xs font-medium" style={{ opacity: 0.5, color: 'var(--foreground)' }}>
                Câu hỏi gợi ý:
              </div>
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInputValue(question);
                      // Use a slight delay so the state updates before sending
                      setTimeout(() => {
                        const userMsg: Message = {
                          id: Date.now(),
                          text: question,
                          sender: 'user',
                          timestamp: new Date(),
                        };
                        setMessages((prev) => [...prev, userMsg]);
                        setIsTyping(true);
                        fetchBotReply(question)
                          .then((reply) => {
                            setMessages((prev) => [
                              ...prev,
                              { id: Date.now(), text: reply, sender: 'bot', timestamp: new Date() },
                            ]);
                          })
                          .catch(() => {
                            setMessages((prev) => [
                              ...prev,
                              { id: Date.now(), text: 'Không thể kết nối server AI.', sender: 'bot', timestamp: new Date(), isError: true },
                            ]);
                          })
                          .finally(() => setIsTyping(false));
                        setInputValue('');
                      }, 50);
                    }}
                    className="rounded-lg px-3 py-1.5 text-xs transition-colors"
                    style={{
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                      color: 'var(--foreground)',
                    }}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Nhập câu hỏi của bạn..."
                disabled={isTyping}
                className="flex-1 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#559DD2]/30"
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  opacity: isTyping ? 0.6 : 1,
                }}
              />
              <button
                onClick={handleSend}
                disabled={!inputValue.trim() || isTyping}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#559DD2] text-black transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>

            {/* Disclaimer */}
            <div className="mt-3 text-xs" style={{ opacity: 0.4, color: 'var(--foreground)' }}>
              Lưu ý: AI không đưa ra lời khuyên đầu tư. Nội dung chỉ mang tính giáo dục.
            </div>
          </div>
        </>
      )}
    </div>
  );
}
