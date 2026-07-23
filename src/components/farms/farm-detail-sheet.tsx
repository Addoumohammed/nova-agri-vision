/**
 * Farm detail sheet — Overview, Fields, Activities, Documents tabs.
 * Includes inline create/edit/delete for each subresource.
 */
import {
  BadgeCheck, Calendar, Droplets, FileText, Layers, Loader2, MapPin, Pencil,
  Plus, Sprout, Trash2, Ruler, Mail, Phone, ExternalLink, AlertTriangle,
} from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useFarmDetail, useFarmMutations } from "@/hooks/use-farms";
import { fmtDate, fmtHa, fieldStatusTone, activityTone, docTone } from "@/lib/farms/format";
import type { FarmActivity, FarmDetail, FarmDocument, FarmField } from "@/lib/farms/types";
import { FieldFormDialog } from "./field-form-dialog";
import { ActivityFormDialog } from "./activity-form-dialog";
import { DocumentFormDialog } from "./document-form-dialog";
import { cn } from "@/lib/utils";

const NovaMap = lazy(() => import("@/components/nova-map"));

interface Props {
  farmId: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: (farm: FarmDetail) => void;
  onDeleted?: () => void;
}

const toneCls: Record<string, string> = {
  success: "bg-emerald-500/15 text-emerald-500",
  info: "bg-blue-500/15 text-blue-500",
  warning: "bg-amber-500/15 text-amber-500",
  danger: "bg-rose-500/15 text-rose-500",
  muted: "bg-muted text-muted-foreground",
};

export function FarmDetailSheet({ farmId, open, onOpenChange, onEdit, onDeleted }: Props) {
  const { data, isLoading } = useFarmDetail(open ? farmId : null);
  const { removeFarm } = useFarmMutations();
  const [fieldOpen, setFieldOpen] = useState(false);
  const [editingField, setEditingField] = useState<FarmField | null>(null);
  const [activityOpen, setActivityOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FarmActivity | null>(null);
  const [docOpen, setDocOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<FarmDocument | null>(null);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-primary" aria-hidden />
            {data?.name ?? "Farm"}
            {data && data.certifications.length > 0 && <BadgeCheck className="h-4 w-4 text-primary" />}
          </SheetTitle>
          <SheetDescription>
            {data ? [data.region, data.country].filter(Boolean).join(", ") || data.address || "—" : "Loading…"}
          </SheetDescription>
        </SheetHeader>

        {isLoading || !data ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onEdit(data)} className="gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> Edit farm
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-rose-500 hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this farm?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove {data.name}, its fields, activities and documents.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-rose-500 hover:bg-rose-600"
                      onClick={async () => {
                        await removeFarm.mutateAsync({ data: { id: data.id } });
                        onOpenChange(false);
                        onDeleted?.();
                      }}
                    >
                      {removeFarm.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <Tabs defaultValue="overview" className="mt-6">
              <TabsList className="w-full">
                <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
                <TabsTrigger value="fields" className="flex-1">Fields ({data.fields.length})</TabsTrigger>
                <TabsTrigger value="activities" className="flex-1">Activities ({data.activities.length})</TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">Docs ({data.documents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat icon={Ruler} label="Total area" value={fmtHa(data.areaHectares)} />
                  <Stat icon={Layers} label="Fields" value={String(data.fields.length)} />
                  <Stat icon={Droplets} label="Irrigation" value={data.irrigationType ?? "—"} />
                  <Stat icon={MapPin} label="Location" value={data.country ?? "—"} />
                </div>
                {data.description && (
                  <div className="rounded-xl border border-border bg-card/50 p-3 text-sm">{data.description}</div>
                )}
                {(data.contactName || data.contactPhone || data.contactEmail) && (
                  <div className="rounded-xl border border-border bg-card/50 p-3 space-y-1.5 text-sm">
                    <div className="text-xs font-medium uppercase text-muted-foreground">Contact</div>
                    {data.contactName && <div>{data.contactName}</div>}
                    {data.contactPhone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {data.contactPhone}</div>}
                    {data.contactEmail && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {data.contactEmail}</div>}
                  </div>
                )}
                {data.crops.length > 0 && (
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Crops</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.crops.map((c) => (
                        <span key={c} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{c}</span>
                      ))}
                    </div>
                  </div>
                )}
                {data.certifications.length > 0 && (
                  <div>
                    <div className="text-xs font-medium uppercase text-muted-foreground mb-1.5">Certifications</div>
                    <div className="flex flex-wrap gap-1.5">
                      {data.certifications.map((c) => (
                        <span key={c} className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-xs text-gold">
                          <BadgeCheck className="h-3 w-3" /> {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {typeof data.latitude === "number" && typeof data.longitude === "number" && (
                  <div className="rounded-xl border border-border bg-card/50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-xs font-medium uppercase text-muted-foreground">Location</div>
                      <a
                        href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                      >
                        Open in Google Maps <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <ClientOnly fallback={<div className="h-[240px] rounded-lg bg-muted/30 animate-pulse" />}>
                      <Suspense fallback={<div className="h-[240px] rounded-lg bg-muted/30 animate-pulse" />}>
                        <NovaMap
                          height={240}
                          enableWeatherLayer
                          markers={[{
                            id: data.id,
                            lat: data.latitude,
                            lon: data.longitude,
                            label: data.name,
                            description: [data.region, data.country].filter(Boolean).join(", ") || undefined,
                          }]}
                          polygons={data.fields
                            .filter((f) => Array.isArray((f as any).boundary) && (f as any).boundary.length >= 3)
                            .map((f) => ({
                              id: f.id,
                              label: f.name,
                              path: (f as any).boundary as Array<{ lat: number; lon: number }>,
                            }))}
                        />
                      </Suspense>
                    </ClientOnly>
                    <div className="mt-1 text-[10px] text-muted-foreground font-mono">
                      {data.latitude.toFixed(4)}, {data.longitude.toFixed(4)}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="fields" className="mt-4 space-y-3">
                <SectionHeader
                  title="Fields & crops"
                  onAdd={() => { setEditingField(null); setFieldOpen(true); }}
                />
                {data.fields.length === 0 ? (
                  <Empty label="No fields yet. Add your first plot." />
                ) : (
                  <div className="space-y-2">
                    {data.fields.map((f) => (
                      <FieldRow key={f.id} field={f} farmId={data.id}
                        onEdit={() => { setEditingField(f); setFieldOpen(true); }} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="activities" className="mt-4 space-y-3">
                <SectionHeader
                  title="Activity timeline"
                  onAdd={() => { setEditingActivity(null); setActivityOpen(true); }}
                />
                {data.activities.length === 0 ? (
                  <Empty label="No activities logged yet." />
                ) : (
                  <div className="space-y-2">
                    {data.activities.map((a) => (
                      <ActivityRow key={a.id} activity={a} farmId={data.id}
                        onEdit={() => { setEditingActivity(a); setActivityOpen(true); }} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-4 space-y-3">
                <SectionHeader
                  title="Documents"
                  onAdd={() => { setEditingDoc(null); setDocOpen(true); }}
                />
                {data.documents.length === 0 ? (
                  <Empty label="No documents uploaded yet." />
                ) : (
                  <div className="space-y-2">
                    {data.documents.map((d) => (
                      <DocumentRow key={d.id} doc={d} farmId={data.id}
                        onEdit={() => { setEditingDoc(d); setDocOpen(true); }} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <FieldFormDialog open={fieldOpen} onOpenChange={setFieldOpen} farmId={data.id} field={editingField} />
            <ActivityFormDialog open={activityOpen} onOpenChange={setActivityOpen} farmId={data.id}
              fields={data.fields} activity={editingActivity} />
            <DocumentFormDialog open={docOpen} onOpenChange={setDocOpen} farmId={data.id} doc={editingDoc} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-1 font-semibold capitalize truncate">{value}</div>
    </div>
  );
}

function SectionHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-semibold">{title}</h4>
      <Button size="sm" variant="outline" className="gap-1.5" onClick={onAdd}>
        <Plus className="h-3.5 w-3.5" /> Add
      </Button>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function FieldRow({ field, farmId, onEdit }: { field: FarmField; farmId: string; onEdit: () => void }) {
  const { removeField } = useFarmMutations();
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{field.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", toneCls[fieldStatusTone(field.status)])}>
              {field.status}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {field.crop && <span>🌾 {field.crop}{field.variety ? ` · ${field.variety}` : ""}</span>}
            <span>📐 {fmtHa(field.areaHectares)}</span>
            {field.plantingDate && <span>🌱 {fmtDate(field.plantingDate)}</span>}
            {field.expectedHarvestDate && <span>🚜 {fmtDate(field.expectedHarvestDate)}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit field"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="text-rose-500" aria-label="Delete field"
            onClick={() => removeField.mutate({ data: { id: field.id, farmId } })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ activity, farmId, onEdit }: { activity: FarmActivity; farmId: string; onEdit: () => void }) {
  const { removeActivity } = useFarmMutations();
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", toneCls[activityTone(activity.activityType)])}>
              {activity.activityType.replace("_", " ")}
            </span>
            <span className="font-medium truncate">{activity.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(activity.occurredAt)}</span>
            {activity.cost != null && <span>💰 {activity.cost.toLocaleString()} {activity.currency ?? "USD"}</span>}
          </div>
          {activity.notes && <p className="mt-1.5 text-xs text-muted-foreground">{activity.notes}</p>}
        </div>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit activity"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="text-rose-500" aria-label="Delete activity"
            onClick={() => removeActivity.mutate({ data: { id: activity.id, farmId } })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function DocumentRow({ doc, farmId, onEdit }: { doc: FarmDocument; farmId: string; onEdit: () => void }) {
  const { removeDocument } = useFarmMutations();
  const tone = docTone(doc.docType, doc.expiresAt);
  const expired = doc.expiresAt && new Date(doc.expiresAt).getTime() < Date.now();
  return (
    <div className="rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium truncate">{doc.title}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", toneCls[tone])}>
              {doc.docType.replace("_", " ")}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {doc.issuedAt && <span>Issued {fmtDate(doc.issuedAt)}</span>}
            {doc.expiresAt && (
              <span className={cn(expired && "text-rose-500")}>
                {expired && <AlertTriangle className="inline h-3 w-3 me-1" />} Expires {fmtDate(doc.expiresAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {doc.url && (
            <Button size="icon" variant="ghost" asChild aria-label="Open document">
              <a href={doc.url} target="_blank" rel="noreferrer noopener"><ExternalLink className="h-3.5 w-3.5" /></a>
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={onEdit} aria-label="Edit document"><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="text-rose-500" aria-label="Delete document"
            onClick={() => removeDocument.mutate({ data: { id: doc.id, farmId } })}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
