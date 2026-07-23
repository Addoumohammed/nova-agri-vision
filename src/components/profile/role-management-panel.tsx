import { Users, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceMembers } from "@/hooks/use-profile";

export function RoleManagementPanel() {
  const { data, isLoading, isError } = useWorkspaceMembers();

  if (isError) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span className="text-sm">Admin access required to view workspace roles.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <h3 className="font-display font-bold">Roles & access</h3>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading members…</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 font-medium">Member</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Granted</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={`${m.userId}-${m.role}`} className="border-t border-border">
                  <td className="px-3 py-2">
                    <div className="font-medium">{m.fullName ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{m.userId.slice(0, 8)}…</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No role assignments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Assign roles from the CLI or a future admin console. Role changes take effect on next sign-in.
      </p>
    </div>
  );
}
