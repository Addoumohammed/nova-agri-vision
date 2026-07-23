import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useDeleteAccount } from "@/hooks/use-profile";

export function DeleteAccountDialog({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const del = useDeleteAccount();
  const valid = confirmation === "delete my account" && password.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPassword(""); setConfirmation(""); setReason(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2">
          <Trash2 className="h-4 w-4" /> Delete account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" /> Delete account
          </DialogTitle>
          <DialogDescription>
            This permanently removes your account and personal data. Business records you own may remain
            for compliance. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="del-pw">Enter your password</Label>
            <Input
              id="del-pw"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="del-conf">
              Type <span className="font-mono text-destructive">delete my account</span> to confirm
            </Label>
            <Input
              id="del-conf"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="delete my account"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="del-reason">Reason (optional)</Label>
            <Textarea
              id="del-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            variant="destructive"
            disabled={!valid || del.isPending}
            onClick={() =>
              del.mutate({
                email,
                password,
                confirmation: "delete my account",
                reason: reason || undefined,
              })
            }
          >
            <Trash2 className="h-4 w-4 me-2" /> Permanently delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
