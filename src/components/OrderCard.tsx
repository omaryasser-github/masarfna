import { useNavigate } from "@tanstack/react-router";
import { Clock, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEGP, type Expense } from "@/lib/expenses";

export function relativeDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const day = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - day.getTime()) / 86400000);
  if (diff <= 0) return "النهاردة";
  if (diff === 1) return "امبارح";
  if (diff === 2) return "من يومين";
  if (diff <= 10) return `من ${diff} أيام`;
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(day);
}

export function OrderCard({ order, isAdmin, className }: { order: Expense; isAdmin: boolean; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={`card-soft rounded-xl border border-border bg-card p-4 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-bold leading-tight">{order.store_name}</p>
        <span className="shrink-0 font-bold text-primary">{formatEGP(order.amount)}</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Badge variant="secondary">{order.category}</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" /> {relativeDay(order.spent_on)}
        </span>
      </div>
      {isAdmin && (
        <Button
          size="sm"
          className="mt-3 w-full"
          onClick={() => navigate({ to: "/log", search: { store: order.store_name, category: order.category } })}
        >
          <RotateCcw className="size-4" /> إعادة الطلب وتسجيل الفاتورة
        </Button>
      )}
    </div>
  );
}
