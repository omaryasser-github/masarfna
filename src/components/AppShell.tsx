import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, PlusCircle, LogOut, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Wallet className="size-5" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">مصاريف العيلة</p>
              <p className="text-xs text-muted-foreground">
                {isAdmin ? "مسؤول" : "مشاهدة فقط"} · {user?.email}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="تسجيل الخروج">
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-stretch">
          <Link
            to="/dashboard"
            className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            <LayoutDashboard className="size-5" />
            اللوحة
          </Link>
          {isAdmin ? (
            <Link
              to="/log"
              className="flex flex-1 flex-col items-center gap-1 py-3 text-xs text-muted-foreground"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <PlusCircle className="size-5" />
              سجّل مصروف
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
