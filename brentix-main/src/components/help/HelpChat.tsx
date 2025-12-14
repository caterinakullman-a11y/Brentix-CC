import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircleQuestion, 
  X, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  Loader2,
  ArrowLeftRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { findBestMatch, type HelpTopic } from "./helpKnowledge";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  relatedTopics?: HelpTopic[];
}

const QUICK_QUESTIONS = [
  "Vad är RSI?",
  "Hur fungerar auto-trading?",
  "Vad är paper trading?",
  "Hur sätter jag stop-loss?",
  "Vad är en trailing stop?",
];

const CHAT_POSITION_KEY = "brentix-help-chat-position";

export function HelpChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<"left" | "right">(() => {
    const saved = localStorage.getItem(CHAT_POSITION_KEY);
    return saved === "left" ? "left" : "right";
  });
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hej! 👋 Jag är Brentix-assistenten. Fråga mig om vad som helst i appen - tekniska indikatorer, hur du handlar, inställningar, eller något annat!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const generateResponse = async (question: string): Promise<{ answer: string; topics: HelpTopic[] }> => {
    // First, try to find a match in our knowledge base
    const { answer, topics, confidence } = findBestMatch(question);
    
    if (confidence > 0.6) {
      return { answer, topics };
    }

    // If no good match, generate a more generic helpful response
    const genericResponse = `Jag är inte helt säker på vad du menar med "${question}". 

Här är några saker jag kan hjälpa dig med:
• **Tekniska indikatorer** - RSI, MACD, Bollinger Bands, SMA
• **Trading** - Hur du köper/säljer, stop-loss, take-profit
• **Auto-trading** - Automatisk handel baserat på signaler
• **Paper trading** - Öva utan riktiga pengar
• **Avanza-koppling** - Hur du kopplar ditt konto
• **Säkerhet** - Nödstopp, triggers, villkorliga ordrar

Prova att ställa en mer specifik fråga!`;

    return { answer: genericResponse, topics: [] };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate typing delay for more natural feel
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    const { answer, topics } = await generateResponse(userMessage.content);

    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: answer,
      timestamp: new Date(),
      relatedTopics: topics.length > 0 ? topics : undefined,
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
    // Auto-send after a brief moment
    setTimeout(() => {
      handleSend();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const togglePosition = () => {
    const newPosition = position === "right" ? "left" : "right";
    setPosition(newPosition);
    localStorage.setItem(CHAT_POSITION_KEY, newPosition);
  };

  return (
    <>
      {/* Floating Help Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className={cn(
              "fixed bottom-6 z-50",
              position === "right" ? "right-6" : "left-6"
            )}
          >
            <Button
              onClick={() => setIsOpen(true)}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <MessageCircleQuestion className="h-6 w-6" />
            </Button>
            <span className={cn(
              "absolute -top-1 flex h-4 w-4",
              position === "right" ? "-right-1" : "-left-1"
            )}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "fixed bottom-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-100px)] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden",
              position === "right" ? "right-6" : "left-6"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Brentix Hjälp</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Alltid tillgänglig
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={togglePosition}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  title={position === "right" ? "Flytta till vänster" : "Flytta till höger"}
                >
                  <ArrowLeftRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : ""
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div
                      className={cn(
                        "flex flex-col max-w-[80%]",
                        message.role === "user" ? "items-end" : "items-start"
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl px-4 py-2.5 text-sm",
                          message.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground rounded-bl-md"
                        )}
                      >
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      
                      {/* Related Topics */}
                      {message.relatedTopics && message.relatedTopics.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.relatedTopics.slice(0, 3).map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => handleQuickQuestion(topic.question)}
                              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {topic.shortLabel || topic.question.slice(0, 20)}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString("sv-SE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce"></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Quick Questions */}
            {messages.length <= 2 && (
              <div className="px-4 py-2 border-t border-border bg-muted/20">
                <p className="text-xs text-muted-foreground mb-2">Vanliga frågor:</p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleQuickQuestion(q)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-muted transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ställ en fråga..."
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  size="icon"
                  className="shrink-0"
                >
                  {isTyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
