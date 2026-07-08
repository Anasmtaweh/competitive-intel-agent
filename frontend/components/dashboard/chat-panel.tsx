import { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Loader2 } from "lucide-react";

interface ChatPanelProps {
  company: string;
  agents: any;
  verdict: any;
  isEnabled: boolean;
  apiKey?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  type?: "text" | "status" | "status-complete";
}

export function ChatPanel({ company, agents, verdict, isEnabled, apiKey }: ChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isStreaming) return;

    const userMsg = inputValue.trim();
    setInputValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    const reportContext = JSON.stringify({
      company,
      agents,
      verdict: verdict?.verdict,
      reasoning: verdict?.reasoning
    });

    const conversationHistory = messages
      .filter(m => m.type !== "status" && m.type !== "status-complete" && m.content.trim() !== "")
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-6);

      const bodyPayload: any = { company, query: userMsg, report_context: reportContext, history: conversationHistory };
      if (apiKey?.trim()) {
        bodyPayload.api_key = apiKey.trim();
      }

      const response = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      if (!response.ok) throw new Error("Failed to connect to chat API");
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      // Add initial empty assistant message
      setMessages((prev) => [...prev, { role: "assistant", content: "", type: "text" }]);

      let done = false;
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          const lines = chunkStr.split("\n\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === "status") {
                  // Insert the status message BEFORE the currently streaming empty message
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    // The last message is the empty assistant text message, insert before it
                    newMessages.splice(newMessages.length - 1, 0, { 
                      role: "assistant", 
                      content: data.message, 
                      type: "status" 
                    });
                    return newMessages;
                  });
                } else if (data.type === "chunk") {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    
                    // Mark any pending status messages as complete
                    for (let i = newMessages.length - 1; i >= 0; i--) {
                      if (newMessages[i].type === "status") {
                        newMessages[i].type = "status-complete";
                        break;
                      }
                    }

                    const lastIdx = newMessages.length - 1;
                    if (newMessages[lastIdx].type === "text") {
                      newMessages[lastIdx].content += data.message;
                    }
                    return newMessages;
                  });
                } else if (data.type === "error") {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].content += "\n\n[Error: " + data.message + "]";
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Error parsing SSE JSON:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [...prev, { role: "assistant", content: "Error connecting to chat." }]);
    } finally {
      setIsStreaming(false);
    }
  };

  if (!isEnabled) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 rounded-full bg-[var(--verdict-invest)] text-black shadow-lg hover:opacity-90 transition-all z-40 ${isOpen ? 'scale-0' : 'scale-100'}`}
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[550px] bg-black/40 backdrop-blur-2xl border-l border-white/10 shadow-2xl transition-transform duration-300 z-50 flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-white/70" />
            <h3 className="font-semibold text-white">Ask about {company}</h3>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-white/50 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-white/40 mt-10">
              <p>Ask a question about the generated report for {company}.</p>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              {msg.type === 'status' || msg.type === 'status-complete' ? (
                <div className="flex items-center gap-2 text-white/40 text-xs my-2 p-2 bg-white/5 rounded-lg border border-white/10 w-fit">
                  {msg.type === 'status' ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[var(--verdict-invest)]" />
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--verdict-invest)] opacity-80" />
                  )}
                  <span>{msg.content}</span>
                </div>
              ) : (
                <div
                  className={`max-w-[90%] rounded-xl px-4 py-2 ${
                    msg.role === 'user'
                      ? 'bg-white/10 text-white'
                      : 'bg-black/50 text-white/80 border border-white/5'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-light font-mono">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20">
          <form onSubmit={handleSubmit} className="flex gap-2 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputValue}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything (Shift+Enter for new line)..."
              disabled={isStreaming}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 disabled:opacity-50 resize-none overflow-hidden min-h-[46px]"
              style={{ maxHeight: '200px' }}
            />
            <button
              type="submit"
              disabled={isStreaming || !inputValue.trim()}
              className="absolute right-2 bottom-2 aspect-square p-2 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4 ml-[-2px] mt-[2px]" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
