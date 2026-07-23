import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Send,
  Mic,
  MicOff,
  Volume2,
  Paperclip,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Leaf,
  TrendingUp,
  Lightbulb,
  Languages,
  Loader2,
  StopCircle,
  MessageSquare,
  FileText,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  listConversations,
  createConversation,
  deleteConversation,
  getConversation,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_app/nova-ai")({ component: NovaAiPage });

type ConvRow = {
  id: string;
  title: string;
  model: string | null;
  created_at: string;
  updated_at: string;
};

type ActionPreset = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  prompt: string;
  systemHint?: string;
};

const ACTIONS: ActionPreset[] = [
  {
    id: "crop-disease",
    label: "Crop disease scan",
    icon: Leaf,
    color: "from-emerald-500 to-teal-500",
    prompt:
      "Analyze the attached crop image for signs of disease, pests, or nutrient deficiency. Return: (1) most likely condition with confidence, (2) visible symptoms, (3) recommended treatment protocol, (4) prevention measures.",
    systemHint: "The user needs a plant-pathology diagnosis. If no image is attached, ask them to attach one.",
  },
  {
    id: "market-prediction",
    label: "Market prediction",
    icon: TrendingUp,
    color: "from-amber-500 to-orange-500",
    prompt:
      "Give a 90-day price outlook for a commodity of my choice. Cover: current trend, key demand drivers, supply risks, seasonal factors, and a low/base/high scenario. If I haven't specified the commodity, ask which one.",
  },
  {
    id: "business-reco",
    label: "Business recommendations",
    icon: Lightbulb,
    color: "from-violet-500 to-fuchsia-500",
    prompt:
      "Based on Nova Pro's typical agricultural trade flows, suggest 3 concrete growth actions I can take this quarter. For each: opportunity, effort, expected impact, and first step.",
  },
  {
    id: "translate",
    label: "Translate document",
    icon: Languages,
    color: "from-sky-500 to-cyan-500",
    prompt: "Translate the text I paste (or the attached document) into fluent English and Arabic side-by-side, preserving trade terminology.",
  },
];

const SUGGESTED = [
  "Compare olive oil export prices between Morocco and Spain",
  "Draft a proforma invoice for 120 MT of Grade A oranges to Rotterdam",
  "What documents does Saudi Arabia require to import basmati rice?",
  "Summarize weather risk this week for Alexandria → Hamburg sea route",
];

const MAX_INPUT_CHARS = 8000;

function NovaAiPage() {
  const { dir } = useI18n();
  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([]);
  const [conversationKey, setConversationKey] = useState(0);
  const [search, setSearch] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<{ stop: () => void; start: () => void } | null>(null);

  // Refs read by the (stable) transport so we avoid closure-stale reads and
  // don't rebuild the transport mid-stream.
  const activeIdRef = useRef<string | null>(null);
  const systemHintRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  const refreshConversations = async () => {
    try {
      const rows = await listConversations();
      setConversations(rows);
      return rows;
    } catch (err) {
      console.error("listConversations", err);
      return [];
    } finally {
      setLoadingConvs(false);
    }
  };

  useEffect(() => {
    void refreshConversations();
  }, []);

  // Cancel any in-flight speech/recognition when leaving the page.
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      recognitionRef.current?.stop?.();
    };
  }, []);

  // Load messages when active conversation changes.
  useEffect(() => {
    if (!activeId) {
      setInitialMessages([]);
      setConversationKey((k) => k + 1);
      return;
    }
    void (async () => {
      try {
        const res = await getConversation({ data: { id: activeId } });
        const msgs: UIMessage[] =
          res?.messages.map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
            parts: [{ type: "text", text: m.content }],
          })) ?? [];
        setInitialMessages(msgs);
        setConversationKey((k) => k + 1);
      } catch (err) {
        console.error("getConversation", err);
        toast.error("Could not load conversation");
      }
    })();
  }, [activeId]);

  // Stable transport — reads current values from refs and captures the
  // server-minted conversation id from the response header so a fresh chat
  // stays linked to a single conversation row.
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        fetch: async (input, init) => {
          const res = await fetch(input, init);
          const cid = res.headers.get("X-Nova-Conversation-Id");
          if (cid && !activeIdRef.current) {
            activeIdRef.current = cid;
            setActiveId(cid);
          }
          return res;
        },
        prepareSendMessagesRequest: async ({ messages, body }) => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return {
            body: {
              messages,
              conversationId: activeIdRef.current,
              systemHint: systemHintRef.current,
              ...(body ?? {}),
            },
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          };
        },
      }),
    [],
  );

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: `nova-${conversationKey}`,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message ?? "AI request failed"),
    onFinish: async () => {
      await refreshConversations();
      if (voiceOn) speakLastAssistantMessage();
    },
  });

  // Auto-scroll on new content.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  // Speech recognition (Web Speech API).
  const startListening = () => {
    type SRCtor = new () => {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      onerror: () => void;
      start: () => void;
      stop: () => void;
    };
    const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice input isn't supported in this browser");
      return;
    }
    const rec = new SR();
    rec.lang = dir === "rtl" ? "ar-SA" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      const text = ev.results[0]?.[0]?.transcript?.trim();
      if (text) setInput((s) => (s ? `${s} ${text}` : text));
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };
  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const speakLastAssistantMessage = () => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    const text = last.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
    if (!text) return;
    speak(text);
  };
  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      toast.error("Voice output isn't supported in this browser");
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 800));
    u.lang = dir === "rtl" ? "ar-SA" : "en-US";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  };

  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";

  const handleSend = async (overrideText?: string, hint?: string) => {
    const raw = (overrideText ?? input).trim();
    if (!raw && attachments.length === 0) return;
    const text = raw.length > MAX_INPUT_CHARS ? raw.slice(0, MAX_INPUT_CHARS) : raw;
    if (raw.length > MAX_INPUT_CHARS) {
      toast.warning(`Message trimmed to ${MAX_INPUT_CHARS} characters.`);
    }
    setInput("");
    systemHintRef.current = hint;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    try {
      let fileList: FileList | undefined;
      if (attachments.length > 0) {
        const dt = new DataTransfer();
        attachments.forEach((f) => dt.items.add(f));
        fileList = dt.files;
      }
      await sendMessage({
        text: text || "Please analyze the attached file.",
        files: fileList,
      });
      setAttachments([]);
    } catch (e) {
      console.error(e);
    } finally {
      systemHintRef.current = undefined;
    }
  };

  const handleNew = async () => {
    try {
      const conv = await createConversation({ data: {} });
      await refreshConversations();
      setMessages([]);
      setActiveId(conv.id);
    } catch (err) {
      console.error(err);
      toast.error("Could not create new chat");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConversation({ data: { id } });
      if (activeId === id) setActiveId(null);
      await refreshConversations();
    } catch (err) {
      console.error(err);
      toast.error("Could not delete conversation");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    const filtered = files.filter((f) => f.size <= 15 * 1024 * 1024);
    if (filtered.length !== files.length) toast.warning("Some files exceeded 15 MB and were skipped");
    setAttachments((prev) => [...prev, ...filtered].slice(0, 4));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredConvs = conversations.filter((c) =>
    !search.trim() ? true : c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="grid h-[calc(100vh-4rem)] grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
      {/* Sidebar */}
      <aside className="hidden flex-col rounded-2xl border bg-card lg:flex">
        <div className="border-b p-3">
          <Button onClick={handleNew} className="w-full gap-2">
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search chats"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <MessageSquare className="mx-auto mb-2 h-6 w-6 opacity-40" />
                No conversations yet.
                <br />
                Start with a prompt below.
              </div>
            ) : (
              filteredConvs.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition hover:bg-muted",
                    activeId === c.id && "border-primary/20 bg-primary/10",
                  )}
                >
                  <button
                    type="button"
                    className="flex-1 truncate text-start"
                    onClick={() => setActiveId(c.id)}
                    title={c.title}
                  >
                    {c.title}
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    onClick={() => handleDelete(c.id)}
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </aside>

      {/* Chat */}
      <section className="flex min-h-0 flex-col rounded-2xl border bg-card">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-semibold">
                Nova AI Copilot
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ● online
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Enterprise assistant for agriculture and international trade
              </div>
            </div>
          </div>
          <Button
            variant={voiceOn ? "default" : "outline"}
            size="sm"
            onClick={() => setVoiceOn((v) => !v)}
            className="gap-2"
          >
            <Volume2 className="h-4 w-4" /> {voiceOn ? "Voice on" : "Voice off"}
          </Button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <EmptyState onAction={(a) => handleSend(a.prompt, a.systemHint)} onSuggest={(s) => handleSend(s)} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              {messages.map((m) => (
                <MessageBubble key={m.id} m={m} onSpeak={speak} />
              ))}
              {status === "submitted" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Nova is thinking…
                </div>
              )}
              {error && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {error.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="border-t bg-background/50 p-3 backdrop-blur">
          {attachments.length > 0 && (
            <div className="mx-auto mb-2 flex max-w-3xl flex-wrap gap-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-xs">
                  {f.type.startsWith("image/") ? (
                    <ImageIcon className="h-3.5 w-3.5" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-[180px] truncate">{f.name}</span>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <form
            className="mx-auto flex max-w-3xl items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSend();
            }}
          >
            <input
              type="file"
              multiple
              hidden
              ref={fileInputRef}
              accept="image/*,application/pdf,text/*"
              onChange={onFileChange}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach file"
              disabled={busy}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant={listening ? "default" : "outline"}
              size="icon"
              onClick={listening ? stopListening : startListening}
              aria-label="Voice input"
              disabled={busy}
            >
              {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Ask about crops, markets, shipments, invoices…"
              rows={1}
              className="min-h-[44px] max-h-40 flex-1 resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
            {busy ? (
              <Button type="button" variant="destructive" size="icon" onClick={() => stop()} aria-label="Stop">
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" size="icon" disabled={!input.trim() && attachments.length === 0} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
          <div className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-muted-foreground">
            Nova AI can make mistakes. Verify critical decisions with source data.
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({
  onAction,
  onSuggest,
}: {
  onAction: (a: ActionPreset) => void;
  onSuggest: (s: string) => void;
}) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-8 py-8 text-center">
      <div>
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">How can I help you today?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyze crops, forecast markets, review documents, translate — all from one place.
        </p>
      </div>

      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onAction(a)}
            className="group flex items-start gap-3 rounded-xl border bg-card p-4 text-start transition hover:border-primary/40 hover:shadow-md"
          >
            <div className={cn("grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br text-white", a.color)}>
              <a.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-medium">{a.label}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.prompt}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="w-full space-y-2">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Try asking</div>
        <div className="flex flex-wrap justify-center gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSuggest(s)}
              className="rounded-full border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ m, onSpeak }: { m: UIMessage; onSpeak: (t: string) => void }) {
  const isUser = m.role === "user";
  const text = m.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("\n")
    .trim();
  const files = m.parts.filter((p) => p.type === "file") as Array<{
    type: "file";
    mediaType?: string;
    url?: string;
    filename?: string;
  }>;
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-gradient-to-br from-emerald-500 to-cyan-500 text-white",
        )}
      >
        {isUser ? "You" : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
          isUser ? "bg-primary text-primary-foreground" : "border bg-background",
        )}
      >
        {files.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {files.map((f, i) =>
              f.mediaType?.startsWith("image/") && f.url ? (
                <img key={i} src={f.url} alt={f.filename ?? "image"} className="max-h-40 rounded-md" />
              ) : (
                <div key={i} className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1 text-xs">
                  <FileText className="h-3.5 w-3.5" /> {f.filename ?? f.mediaType ?? "file"}
                </div>
              ),
            )}
          </div>
        )}
        {isUser ? (
          <div className="whitespace-pre-wrap">{text}</div>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-pre:my-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
            {text && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onSpeak(text)}
              >
                <Volume2 className="h-3 w-3" /> Read aloud
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
