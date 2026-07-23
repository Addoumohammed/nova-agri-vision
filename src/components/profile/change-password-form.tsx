import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/profile/schemas";
import { scorePassword } from "@/lib/auth/service";
import { useChangePassword } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";

export function ChangePasswordForm({ email }: { email: string }) {
  const [show, setShow] = useState<{ c: boolean; n: boolean }>({ c: false, n: false });
  const { register, handleSubmit, watch, reset, formState } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  const change = useChangePassword();
  const pw = watch("newPassword");
  const strength = scorePassword(pw);

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (v) => {
        await change.mutateAsync({
          email,
          currentPassword: v.currentPassword,
          newPassword: v.newPassword,
        });
        reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cp">Current password</Label>
          <div className="relative">
            <Input
              id="cp"
              type={show.c ? "text" : "password"}
              autoComplete="current-password"
              {...register("currentPassword")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow((s) => ({ ...s, c: !s.c }))}
              aria-label="Toggle password visibility"
            >
              {show.c ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {formState.errors.currentPassword && (
            <p className="text-xs text-destructive">{formState.errors.currentPassword.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np">New password</Label>
          <div className="relative">
            <Input
              id="np"
              type={show.n ? "text" : "password"}
              autoComplete="new-password"
              {...register("newPassword")}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setShow((s) => ({ ...s, n: !s.n }))}
              aria-label="Toggle password visibility"
            >
              {show.n ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {pw && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all", strength.colorClass)}
                  style={{ width: `${(strength.score / 4) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">{strength.labelKey.split(".").pop()}</span>
            </div>
          )}
          {formState.errors.newPassword && (
            <p className="text-xs text-destructive">
              {String(formState.errors.newPassword.message)}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cnf">Confirm new password</Label>
          <Input id="cnf" type="password" autoComplete="new-password" {...register("confirmPassword")} />
          {formState.errors.confirmPassword && (
            <p className="text-xs text-destructive">{formState.errors.confirmPassword.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={change.isPending || formState.isSubmitting} className="gap-2">
          <KeyRound className="h-4 w-4" /> Update password
        </Button>
      </div>
    </form>
  );
}
