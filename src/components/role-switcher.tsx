import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLES, useRole } from "@/lib/role";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const active = ROLES.find((r) => r.value === role)!;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 h-9">
          <UserCog className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold capitalize">{active.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch role (demo)</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLES.map((r) => (
          <DropdownMenuItem key={r.value} onClick={() => setRole(r.value)}>
            <div className="flex flex-col">
              <span className="font-semibold">{r.label}</span>
              <span className="text-xs text-muted-foreground">{r.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
