import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, TrendingUp, AlertTriangle, Users, DollarSign, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    type?: "insight" | "anomaly" | "summary" | "comparison";
    links?: Array<{ label: string; url: string }>;
    metrics?: Array<{ label: string; value: string; icon?: any }>;
    suggestions?: string[];
  };
  isTyping?: boolean;
}

const SUGGESTED_PROMPTS = [
  "Top vendors this month 🏪",
  "Approved expenses last 24 hours ✅",
  "Compare last 3 months trends 📊",
  "Total reimbursements by employee 💰",
  "Show pending claims by category 📋"
];

export const AnalyticsChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! 👋 I'm your **Paisaback Copilot**. Ask me anything:\n\n• Expense analytics & trends\n• Vendor & employee breakdowns\n• Time-based comparisons\n• Anomaly detection\n\nTry: *\"Show approved expenses last 24 hours\"*",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [typingMessage, setTypingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Typing animation effect
  const typeMessage = async (fullText: string, metadata?: any) => {
    const words = fullText.split(' ');
    let current = '';
    
    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      setTypingMessage(current);
      await new Promise(resolve => setTimeout(resolve, 30)); // Fast typing
    }
    
    setTypingMessage("");
    setMessages(prev => [...prev, {
      role: "assistant",
      content: fullText,
      metadata
    }]);
  };

  const handleSend = async (query?: string) => {
    const userMessage = query || input.trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analytics-chatbot", {
        body: { 
          query: userMessage, 
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      // Type out the response with animation
      await typeMessage(data.response, data.metadata);
      
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast.error("Failed to get response");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again. 😔"
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const renderMessage = (msg: Message, idx: number) => {
    const isUser = msg.role === "user";
    
    // Clean the content - remove any markdown code blocks
    let cleanContent = msg.content;
    if (!isUser) {
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      if (cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanContent);
          if (parsed.response) {
            cleanContent = parsed.response;
            if (parsed.metadata && !msg.metadata) {
              msg.metadata = parsed.metadata;
            }
          }
        } catch {
          // Use as-is
        }
      }
    }
    
    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div className={`max-w-[85%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/80 backdrop-blur-sm"} rounded-2xl px-4 py-3 shadow-lg`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanContent}</p>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  p: ({children}) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                  strong: ({children}) => <strong className="font-bold text-primary">{children}</strong>,
                  ul: ({children}) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                  li: ({children}) => <li className="text-sm">{children}</li>,
                  code: ({children}) => <code className="bg-background/50 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                }}
              >
                {cleanContent}
              </ReactMarkdown>
            </div>
          )}
          
          {msg.metadata?.metrics && msg.metadata.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/30">
              {msg.metadata.metrics.map((metric, i) => {
                const Icon = metric.icon || DollarSign;
                return (
                  <div key={i} className="flex items-center gap-2 bg-background/50 rounded-lg p-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">{metric.label}</p>
                      <p className="text-sm font-semibold">{metric.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {!isUser && msg.metadata?.links && msg.metadata.links.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/30">
              {msg.metadata.links.map((link, i) => (
                <Button
                  key={i}
                  variant="secondary"
                  size="sm"
                  className="text-xs hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105"
                  onClick={() => window.location.href = link.url}
                >
                  {link.label} →
                </Button>
              ))}
            </div>
          )}
          
          {!isUser && msg.metadata?.suggestions && msg.metadata.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30">
              <p className="text-xs text-muted-foreground w-full mb-1">💡 Try asking:</p>
              {msg.metadata.suggestions.map((suggestion, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 hover:bg-primary/20"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-24 right-6 w-[420px] max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-8rem)] z-[100] shadow-2xl rounded-2xl overflow-hidden border border-border/50 backdrop-blur-xl"
          >
            <Card className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  <div>
                    <h3 className="font-semibold">Paisaback Copilot</h3>
                    <p className="text-xs text-muted-foreground">AI Analytics Assistant</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                
                {typingMessage && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex justify-start mb-4"
                  >
                    <div className="max-w-[85%] bg-muted/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                      <div className="prose prose-sm prose-invert max-w-none">
                        <ReactMarkdown
                          components={{
                            p: ({children}) => <p className="text-sm leading-relaxed mb-2 last:mb-0">{children}</p>,
                            strong: ({children}) => <strong className="font-bold text-primary">{children}</strong>,
                          }}
                        >
                          {typingMessage}
                        </ReactMarkdown>
                        <span className="inline-block w-1 h-4 bg-primary animate-pulse ml-1" />
                      </div>
                    </div>
                  </motion.div>
                )}
                
                {messages.length === 1 && !isLoading && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="space-y-2"
                  >
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" />
                      Quick starts:
                    </p>
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.1 }}
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start text-xs hover:bg-primary/10"
                          onClick={() => handleSend(prompt)}
                        >
                          {prompt}
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
                
                {isLoading && !typingMessage && (
                  <div className="flex justify-start">
                    <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Analyzing...</span>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Ask: 'Top vendors this month' or 'Show trends'..."
                    className="flex-1 bg-background/50"
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={() => handleSend()} 
                    disabled={!input.trim() || isLoading}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Try time filters: "last 24h", "this month", "last quarter"
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring", stiffness: 260, damping: 20 }}
        className="fixed bottom-6 right-6 z-[100]"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-br from-primary to-primary/80 hover:scale-110 transition-transform"
        >
          {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </Button>
      </motion.div>
    </>
  );
};
