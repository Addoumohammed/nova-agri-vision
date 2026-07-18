import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Bot,
  User,
  Mic,
  Paperclip,
  Download,
  Copy,
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Check,
  Zap,
  Globe2,
  TrendingUp,
  Leaf,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/nova-ai")({
  component: NovaAiPage,
});

type Msg = { role: "user" | "ai"; text: string; time: string };
type Conversation = { id: string; title: string; preview: string; time: string; messages: Msg[] };

const now = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const seedConversations: Conversation[] = [
  {
    id: "c1",
    title: "EU orange export strategy",
    preview: "Rotterdam and Hamburg show the strongest margins…",
    time: "2m",
    messages: [
      {
        role: "ai",
        text:
          "Hi Karim — I've reviewed today's markets. Egyptian oranges are trending +6.2% into the EU. Ask me anything about prices, buyers, weather or compliance.",
        time: "09:41",
      },
      {
        role: "user",
        text: "Which EU ports give the best margin for oranges this week?",
        time: "09:42",
      },
      {
        role: "ai",
        text:
          "Based on live trade signals, prioritize **Rotterdam** and **Hamburg**. Estimated margin uplift: **+8.4%** vs. Genoa. Freight rates dropped 3.1% on the Alexandria–Rotterdam corridor.",
        time: "09:42",
      },
    ],
  },
  {
    id: "c2",
    title: "Wheat price forecast · 30 days",
    preview: "CBOT wheat likely to trade between $6.10–6.60…",
    time: "1h",
    messages: [],
  },
  {
    id: "c3",
    title: "Compliance checklist · Gulf",
    preview: "SFDA + GCC-SASO documents required…",
    time: "Yesterday",
    messages: [],
  },
  {
    id: "c4",
    title: "Nile Delta weather risk",
    preview: "High-wind advisory Thursday–Friday…",
    time: "2d",
    messages: [],
  },
];

function NovaAiPage() {
  const { t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>(seedConversations);
  const [activeId, setActiveId] = useState<string>("c1");
  const [messages, setMessages] = useState<Msg[]>(seedConversations[0].messages);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const c = conversations.find((x) => x.id === activeId);
    if (c) setMessages(c.messages);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", text, time: now() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setTimeout(() => {
      const reply: Msg = {
        role: "ai",
        text:
          "I'm analyzing live trade signals, weather models and buyer demand… **Recommendation:** ship to Rotterdam this week — freight is down 3.1%, buyer demand is up 12%, and forecast margin uplift is **+8.4%**.",
        time: now(),
      };
      setMessages((m) => [...m, reply]);
    }, 700);
  };

  const newChat = () => {
    const id = "c" + Date.now();
    const c: Conversation = {
      id,
      title: "New conversation",
      preview: "Start chatting with Nova AI…",
      time: "now",
      messages: [
        {
          role: "ai",
          text: "Fresh session — what would you like to explore today?",
          time: now(),
        },
      ],
    };
    setConversations((cs) => [c, ...cs]);
    setActiveId(id);
  };

  const deleteConv = (id: string) => {
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (id === activeId && conversations[0]) setActiveId(conversations[0].id);
  };

  const copy = (text: string, i: number) => {
    navigator.clipboard?.writeText(text);
    setCopiedIdx(i);
    setTimeout(() => setCopiedIdx(null), 1200);
  };

  const exportConv = () => {
    const body = messages.map((m) => `[${m.time}] ${m.role.toUpperCase()}: ${m.text}`).join("\n\n");
    const blob = new Blob([body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nova-ai-conversation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const suggestions = [
    t("novaai.suggestion1"),
    t("novaai.suggestion2"),
    t("novaai.suggestion3"),
    t("novaai.suggestion4"),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] h-[calc(100vh-8rem)]">
      {/* Conversation history */}
      <aside className="hidden lg:flex flex-col rounded-2xl border border-border bg-card shadow-elegant overflow-hidden">
        <div className="p-4 border-b border-border">
          <Button onClick={newChat} className="w-full bg-gradient-primary shadow-glow gap-2">
            <Plus className="h-4 w-4" /> New chat
          </Button>
          <div className="relative mt-3">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search conversations…" className="ps-9" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group w-full text-start rounded-xl p-3 transition mb-1",
                activeId === c.id ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                <div className="text-sm font-semibold truncate flex-1">{c.title}</div>
                <span className="text-[10px] text-muted-foreground shrink-0">{c.time}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1 line-clamp-1 ps-6">
                {c.preview}
              </div>
              <div className="ps-6 mt-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConv(c.id);
                  }}
                  className="text-[11px] text-red-500 inline-flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> delete
                </button>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat */}
      <div className="flex flex-col rounded-2xl border border-border bg-card shadow-elegant overflow-hidden min-h-0">
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <div className="h-10 w-10 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display font-bold truncate">{t("novaai.title")}</div>
            <div className="text-xs text-muted-foreground truncate">{t("novaai.subtitle")}</div>
          </div>
          <Button variant="ghost" size="sm" onClick={exportConv} className="gap-2">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={newChat} className="gap-2 lg:hidden">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}>
              <div
                className={cn(
                  "h-8 w-8 rounded-full grid place-items-center shrink-0",
                  m.role === "user" ? "bg-gradient-gold" : "bg-gradient-primary",
                )}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4 text-gold-foreground" />
                ) : (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <div className={cn("max-w-[80%] group", m.role === "user" ? "items-end" : "")}>
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground",
                  )}
                  dangerouslySetInnerHTML={{
                    __html: m.text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"),
                  }}
                />
                <div className="mt-1 px-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span>{m.time}</span>
                  {m.role === "ai" && (
                    <button
                      onClick={() => copy(m.text, i)}
                      className="inline-flex items-center gap-1 hover:text-foreground transition"
                    >
                      {copiedIdx === i ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => {
              const Icon = [Zap, TrendingUp, Globe2, Leaf][i] || Sparkles;
              return (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition inline-flex items-center gap-1.5"
                >
                  <Icon className="h-3 w-3 text-primary" />
                  {s}
                </button>
              );
            })}
          </div>
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) send(`📎 Attached: ${f.name}`);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setListening((l) => !l);
                setTimeout(() => setListening(false), 1600);
              }}
              aria-label="Voice input"
              className={cn(listening && "text-primary")}
            >
              <Mic className={cn("h-4 w-4", listening && "animate-pulse")} />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("novaai.placeholder")}
              className="flex-1"
            />
            <Button type="submit" className="bg-gradient-primary shadow-glow gap-2">
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">{t("novaai.send")}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
