import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/nova-ai")({
  component: NovaAiPage,
});

type Msg = { role: "user" | "ai"; text: string };

function NovaAiPage() {
  const { t } = useI18n();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text:
        "Hi Karim — I've reviewed today's markets. Egyptian oranges are trending +6.2% into the EU. Ask me anything about prices, buyers, weather or compliance.",
    },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          role: "ai",
          text:
            "Based on live trade signals, I recommend prioritizing Rotterdam and Hamburg this week. Estimated margin uplift: +8.4%.",
        },
      ]);
    }, 700);
  };

  const suggestions = [
    t("novaai.suggestion1"),
    t("novaai.suggestion2"),
    t("novaai.suggestion3"),
    t("novaai.suggestion4"),
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-2xl bg-gradient-primary grid place-items-center shadow-glow">
          <Sparkles className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">{t("novaai.title")}</h1>
          <p className="text-muted-foreground">{t("novaai.subtitle")}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-elegant flex flex-col h-[60vh]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`h-8 w-8 rounded-full grid place-items-center shrink-0 ${
                  m.role === "user" ? "bg-gradient-gold" : "bg-gradient-primary"
                }`}
              >
                {m.role === "user" ? (
                  <User className="h-4 w-4 text-gold-foreground" />
                ) : (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("novaai.placeholder")}
              className="flex-1"
            />
            <Button type="submit" className="bg-gradient-primary shadow-glow gap-2">
              <Send className="h-4 w-4" />
              {t("novaai.send")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
