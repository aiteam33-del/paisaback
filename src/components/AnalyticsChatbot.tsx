import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { MessageCircle, X, Send, Loader2, TrendingUp, AlertTriangle, Users, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  content: string;
  metadata?: {
    type?: "insight" | "anomaly" | "summary";
    links?: Array<{ label: string; url: string }>;
    metrics?: Array<{ label: string; value: string; icon?: any }>;
  };
}

const SUGGESTED_PROMPTS = [
  "Show me top vendors this month",
  "Any suspicious transactions?",
  "Who has the most pending expenses?",
  "Travel expense trends",
  "Explain flagged payments"
];

export const AnalyticsChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hey! 👋 I'm your analytics copilot. Ask me anything about expenses, vendors, employees, or anomalies.",
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (query?: string) => {
    const userMessage = query || input.trim();
    if (!userMessage || isLoading) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("analytics-chatbot", {
        body: { query: userMessage, conversationHistory: messages.slice(-6) }
      });

      if (error) throw error;

      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.response,
        metadata: data.metadata
      }]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast.error("Failed to get response");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (msg: Message, idx: number) => {
    const isUser = msg.role === "user";
    
    // Clean the content - remove any markdown code blocks
    let cleanContent = msg.content;
    if (!isUser) {
      // Remove ```json and ``` markers if present
      cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      
      // Try to parse if it looks like JSON
      if (cleanContent.startsWith('{') && cleanContent.endsWith('}')) {
        try {
          const parsed = JSON.parse(cleanContent);
          if (parsed.response) {
            cleanContent = parsed.response;
            // Merge metadata if not already present
            if (parsed.metadata && !msg.metadata) {
              msg.metadata = parsed.metadata;
            }
          }
        } catch {
          // If parsing fails, use as-is
        }
      }
    }
    
    return (
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
      >
        <div className={`max-w-[80%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted"} rounded-2xl px-4 py-3`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanContent}</p>
          
          {msg.metadata?.metrics && msg.metadata.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-3">
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
                  className="text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => window.location.href = link.url}
                >
                  {link.label} →
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
              <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <h3 className="font-semibold">Analytics Copilot</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => renderMessage(msg, idx))}
                
                {messages.length === 1 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">Try asking:</p>
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs"
                        onClick={() => handleSend(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border/50 bg-background/50">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Ask about expenses, vendors, trends..."
                    className="flex-1"
                    disabled={isLoading}
                  />
                  <Button onClick={() => handleSend()} disabled={!input.trim() || isLoading}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
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
