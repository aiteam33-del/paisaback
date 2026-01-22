import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  MessageCircle, X, Send, Loader2, DollarSign, Sparkles,
  History, Plus, ChevronLeft, Trash2, MoreVertical
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id?: string;
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

const SUGGESTED_PROMPTS = [
  "Top vendors this month",
  "Approved expenses last 24 hours",
  "Compare last 3 months trends",
  "Which employee has highest claims?",
  "Show duplicate expenses",
  "Anomalies this month"
];

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: "Hey! 👋 I'm your **Paisaback Copilot**. I can answer ANY question about your expense data:\n\n• Which employee has the highest reimbursements?\n• How many duplicate claims exist?\n• Show spending by category this quarter\n• Find anomalies and suspicious patterns\n• Compare trends across time periods\n\nI remember our conversation history, so feel free to ask follow-up questions!",
};

export const AnalyticsChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [typingMessage, setTypingMessage] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessage]);

  // Load conversations when chatbot opens
  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error("Failed to load conversations:", error);
    }
  };

  const loadConversation = async (conversationId: string) => {
    setIsLoadingHistory(true);
    try {
      const { data: messagesData, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = (messagesData || []).map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        metadata: m.metadata as Message["metadata"],
      }));

      setMessages(loadedMessages.length > 0 ? loadedMessages : [WELCOME_MESSAGE]);
      setCurrentConversationId(conversationId);
      setShowHistory(false);
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([WELCOME_MESSAGE]);
    setShowHistory(false);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("chat_conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));

      if (currentConversationId === conversationId) {
        startNewConversation();
      }

      toast.success("Conversation deleted");
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  const createConversation = async (firstMessage: string): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? "..." : "");

      const { data, error } = await supabase
        .from("chat_conversations")
        .insert({
          user_id: user.id,
          title,
        })
        .select()
        .single();

      if (error) throw error;

      setConversations(prev => [data, ...prev]);
      return data.id;
    } catch (error) {
      console.error("Failed to create conversation:", error);
      return null;
    }
  };

  const saveMessage = async (conversationId: string, message: Message) => {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          metadata: message.metadata || null,
        });

      if (error) throw error;
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  const typeMessage = async (fullText: string, metadata?: any) => {
    const words = fullText.split(' ');
    let current = '';

    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      setTypingMessage(current);
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    setTypingMessage("");
    return { role: "assistant" as const, content: fullText, metadata };
  };

  const handleSend = async (query?: string) => {
    const userMessage = query || input.trim();
    if (!userMessage || isLoading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: userMessage };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let conversationId = currentConversationId;

    try {
      // Try to create conversation (may fail if tables don't exist yet)
      if (!conversationId) {
        try {
          conversationId = await createConversation(userMessage);
          if (conversationId) {
            setCurrentConversationId(conversationId);
          }
        } catch (e) {
          console.log("Chat history not available:", e);
          // Continue without history - tables may not exist yet
        }
      }

      // Try to save user message (may fail if tables don't exist)
      if (conversationId) {
        try {
          await saveMessage(conversationId, userMsg);
        } catch (e) {
          console.log("Could not save message:", e);
        }
      }

      // Get all messages for context
      const conversationHistory = messages
        .filter(m => m.role === "user" || m.role === "assistant")
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("analytics-chatbot", {
        body: {
          query: userMessage,
          conversationHistory: [...conversationHistory, { role: "user", content: userMessage }]
        }
      });

      if (error) throw error;

      // Type out the response with animation
      const assistantMsg = await typeMessage(data.response, data.metadata);
      setMessages(prev => [...prev, assistantMsg]);

      // Try to save assistant message
      if (conversationId) {
        try {
          await saveMessage(conversationId, assistantMsg);
        } catch (e) {
          console.log("Could not save assistant message:", e);
        }
      }

    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast.error("Failed to get response");
      const errorMsg: Message = {
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again."
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSend(suggestion);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderMessage = (msg: Message, idx: number) => {
    const isUser = msg.role === "user";

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
        <div className={`max-w-[90%] ${isUser ? "bg-primary text-primary-foreground" : "bg-muted/90 backdrop-blur-sm"} rounded-2xl px-5 py-4 shadow-lg`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanContent}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({children}) => <p className="text-sm leading-relaxed mb-3 last:mb-0 text-foreground">{children}</p>,
                  strong: ({children}) => <strong className="font-bold text-primary">{children}</strong>,
                  ul: ({children}) => <ul className="list-disc pl-4 space-y-1.5 my-3 text-foreground">{children}</ul>,
                  ol: ({children}) => <ol className="list-decimal pl-4 space-y-1.5 my-3 text-foreground">{children}</ol>,
                  li: ({children}) => <li className="text-sm leading-relaxed">{children}</li>,
                  code: ({children}) => <code className="bg-background/70 px-2 py-1 rounded text-xs font-mono text-primary border border-border/30">{children}</code>,
                  table: ({children}) => (
                    <div className="my-4 rounded-lg border border-border/50 overflow-hidden bg-background/50">
                      <Table>{children}</Table>
                    </div>
                  ),
                  thead: ({children}) => <TableHeader className="bg-primary/10">{children}</TableHeader>,
                  tbody: ({children}) => <TableBody>{children}</TableBody>,
                  tr: ({children}) => <TableRow className="border-border/30">{children}</TableRow>,
                  th: ({children}) => <TableHead className="text-xs font-semibold text-foreground py-3 px-4">{children}</TableHead>,
                  td: ({children}) => <TableCell className="text-sm py-3 px-4 text-foreground">{children}</TableCell>,
                  h1: ({children}) => <h1 className="text-lg font-bold text-foreground mb-3 mt-4">{children}</h1>,
                  h2: ({children}) => <h2 className="text-base font-semibold text-foreground mb-2 mt-3">{children}</h2>,
                  h3: ({children}) => <h3 className="text-sm font-semibold text-foreground mb-2 mt-2">{children}</h3>,
                  blockquote: ({children}) => <blockquote className="border-l-4 border-primary/50 pl-4 my-3 text-muted-foreground italic">{children}</blockquote>,
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
              <p className="text-xs text-muted-foreground w-full mb-1">Try asking:</p>
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
            className="fixed bottom-24 right-6 w-[480px] max-w-[calc(100vw-3rem)] h-[650px] max-h-[calc(100vh-8rem)] z-[100] shadow-2xl rounded-2xl overflow-hidden border border-border/50 backdrop-blur-xl"
          >
            <Card className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
                <div className="flex items-center gap-2">
                  {showHistory ? (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowHistory(false)}>
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  )}
                  <div>
                    <h3 className="font-semibold">
                      {showHistory ? "Chat History" : "Paisaback Copilot"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {showHistory ? "Previous conversations" : "AI Analytics Assistant"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!showHistory && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowHistory(true)}
                        title="Chat History"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={startNewConversation}
                        title="New Chat"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {showHistory ? (
                /* History Panel */
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <History className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm font-medium">No conversations yet</p>
                      <p className="text-xs">Start chatting to see your history here</p>
                    </div>
                  ) : (
                    conversations.map((conv) => (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "group p-3 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                          currentConversationId === conv.id
                            ? "border-primary/50 bg-primary/5"
                            : "border-border/50 hover:border-primary/30 bg-card/50"
                        )}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{conv.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(conv.updated_at)}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => deleteConversation(conv.id, e as any)}
                              >
                                <Trash2 className="w-3 h-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              ) : (
                /* Chat Panel */
                <>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
                    {isLoadingHistory ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
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
                              Try asking:
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {SUGGESTED_PROMPTS.map((prompt, i) => (
                                <motion.div
                                  key={i}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.4 + i * 0.05 }}
                                >
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start text-xs hover:bg-primary/10 h-auto py-2 px-3"
                                    onClick={() => handleSend(prompt)}
                                  >
                                    {prompt}
                                  </Button>
                                </motion.div>
                              ))}
                            </div>
                          </motion.div>
                        )}

                        {isLoading && !typingMessage && (
                          <div className="flex justify-start">
                            <div className="bg-muted/80 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg">
                              <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                <span className="text-xs text-muted-foreground">Analyzing your data...</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-border/50 bg-background/80 backdrop-blur-sm">
                    <div className="flex gap-2">
                      <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                        placeholder="Ask anything about your expenses..."
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
                    <p className="text-[10px] text-muted-foreground mt-2 text-center">
                      Powered by AI • Conversations are saved automatically
                    </p>
                  </div>
                </>
              )}
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
