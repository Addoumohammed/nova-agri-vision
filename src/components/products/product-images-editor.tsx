/**
 * Product image editor — URL-based (works with any CDN or hosted image).
 * Enforces MAX_IMAGES, validates URL shape and shows live previews with
 * a broken-image fallback. Fully keyboard operable.
 */
import { ImageOff, Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_IMAGES } from "@/lib/products/constants";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}

function isLikelyUrl(s: string) {
  try { new URL(s); return true; } catch { return false; }
}

export function ProductImagesEditor({ value, onChange, error }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const atLimit = value.length >= MAX_IMAGES;

  function add() {
    const url = draft.trim();
    if (!url) return;
    if (!isLikelyUrl(url)) {
      setLocalError(t("products.error.imageUrl"));
      return;
    }
    if (atLimit) {
      setLocalError(t("products.error.tooManyImages"));
      return;
    }
    if (value.includes(url)) {
      setDraft("");
      return;
    }
    onChange([...value, url]);
    setDraft("");
    setLocalError(null);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setLocalError(null); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={t("products.imageUrlPlaceholder")}
          aria-label={t("products.addImage")}
          disabled={atLimit}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="button" onClick={add} disabled={atLimit || !draft.trim()} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          {t("products.addImage")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("products.imageUrlHint")}</p>
      {(localError || error) && (
        <p role="alert" className="text-xs text-destructive">{localError ?? error}</p>
      )}

      {value.length > 0 && (
        <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2" aria-label={t("products.images")}>
          {value.map((url) => (
            <li key={url} className="relative group">
              <div className={cn(
                "aspect-square overflow-hidden rounded-lg border border-border bg-muted",
                "flex items-center justify-center",
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    img.style.display = "none";
                    (img.nextElementSibling as HTMLElement | null)?.style.setProperty("display", "flex");
                  }}
                />
                <span
                  className="hidden h-full w-full items-center justify-center text-muted-foreground"
                  aria-hidden="true"
                >
                  <ImageOff className="h-6 w-6" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => remove(url)}
                aria-label={t("products.removeImage")}
                className={cn(
                  "absolute end-1 top-1 rounded-full bg-black/60 text-white p-1",
                  "opacity-0 group-hover:opacity-100 focus:opacity-100 transition",
                )}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
