import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Plug,
  Zap,
  Shield,
  ExternalLink,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { toast } from "sonner";
import {
  getIntegrationStatus,
  validateProviderKey,
  type ProviderStatus,
} from "@/lib/public-apis.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/integrations")({ component: IntegrationsPage });

type TestState = "idle" | "testing" | "ok" | "fail";

function IntegrationsPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Record<string, { state: TestState; msg?: string }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const rows = await getIntegrationStatus();
      setProviders(rows);
    } catch (e) {
      toast.error("Failed to load integration status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const testConnection = async (id: string) => {
    setTests((t) => ({ ...t, [id]: { state: "testing" } }));
    try {
      const res = await validateProviderKey({ data: { provider: id } });
      if (res.ok) {
        setTests((t) => ({ ...t, [id]: { state: "ok" } }));
        toast.success(`${id}: connection healthy`);
      } else {
        setTests((t) => ({ ...t, [id]: { state: "fail", msg: res.reason } }));
        toast.error(`${id}: ${res.reason}`);
      }
    } catch (e) {
      setTests((t) => ({ ...t, [id]: { state: "fail", msg: (e as Error).message } }));
    }
  };

  const categories = Array.from(new Set(providers.map((p) => p.category)));
  const configured = providers.filter((p) => p.configured).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connect Nova Pro to real production services — every provider is validated live."
        actions={
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile icon={Plug} title="Providers" value={String(providers.length)} sub="Total integrations wired" />
        <StatTile icon={CheckCircle2} title="Configured" value={String(configured)} sub="Secrets present in environment" />
        <StatTile icon={Shield} title="Security" value="Encrypted" sub="Server-side secrets, never exposed to browser" />
      </div>

      {categories.map((cat) => (
        <section key={cat} className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{cat}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {providers.filter((p) => p.category === cat).map((p) => {
              const test = tests[p.id];
              return (
                <Card key={p.id} className="hover:border-primary/40 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <StatusChip configured={p.configured} keyless={p.keyless} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      {p.envVar ? (
                        <>
                          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                          <code className="text-muted-foreground">{p.envVar}</code>
                        </>
                      ) : (
                        <span className="text-muted-foreground">No API key required</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => testConnection(p.id)}
                        disabled={test?.state === "testing"}
                      >
                        {test?.state === "testing" && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        {test?.state === "ok" && <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />}
                        {test?.state === "fail" && <XCircle className="h-3.5 w-3.5 mr-1.5 text-red-500" />}
                        Test connection
                      </Button>
                      {p.docs.startsWith("http") ? (
                        <a
                          href={p.docs}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Get key <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">{p.docs}</span>
                      )}
                    </div>
                    {test?.state === "fail" && test.msg && (
                      <p className="text-xs text-red-500">{test.msg === "missing_key" ? "Add the API key in Cloud → Secrets, then re-test." : test.msg}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex items-start gap-3">
          <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Adding a new API key</p>
            <p className="text-muted-foreground mt-1">
              Secrets are stored server-side in Lovable Cloud and injected as environment variables at runtime.
              After saving a key, click <span className="font-medium">Test connection</span> to validate it against the live provider.
              Keys are never bundled into the browser.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusChip({ configured, keyless }: { configured: boolean; keyless: boolean }) {
  if (keyless && configured)
    return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Public</Badge>;
  if (configured)
    return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">Configured</Badge>;
  return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Needs key</Badge>;
}

function StatTile({ icon: Icon, title, value, sub }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground uppercase tracking-wide">{title}</div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}
