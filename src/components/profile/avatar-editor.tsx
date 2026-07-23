import { useRef } from "react";
import { Upload, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAvatarUpload } from "@/hooks/use-profile";

export function AvatarEditor({
  userId,
  signedUrl,
  fullName,
  size = 80,
}: {
  userId: string;
  signedUrl: string | null;
  fullName: string | null;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, remove } = useAvatarUpload();
  const initials =
    (fullName ?? "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "•";

  return (
    <div className="flex items-center gap-4">
      <div
        className="rounded-2xl overflow-hidden bg-gradient-gold grid place-items-center text-2xl font-bold text-gold-foreground shadow-glow"
        style={{ width: size, height: size }}
      >
        {signedUrl ? (
          <img
            src={signedUrl}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : initials ? (
          <span>{initials}</span>
        ) : (
          <User className="h-8 w-8" />
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload.mutate({ file: f, userId });
            if (inputRef.current) inputRef.current.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="gap-2"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> Upload photo
        </Button>
        {signedUrl && (
          <Button
            size="sm"
            variant="ghost"
            className="gap-2 text-destructive"
            onClick={() => remove.mutate()}
            disabled={remove.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
