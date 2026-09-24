import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { CalendarDays, ImageIcon, Pencil, PlusCircle, Trash2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import emptyIllustration from "@/assets/empty-expenses.png";
import {
  budgetQuery,
  expensesQuery,
  formatEGP,
  lastSevenDays,
  startOfMonth,
  startOfWeekSat,
  sumBetween,
  type Expense,
} from "@/lib/expenses";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "لوحة المصاريف — مصاريف العيلة" },
      {
        name: "description",
        content: "شوف مصاريف الأسبوع والشهر، وحد الميزانية، ورسم بياني لمصاريف كل يوم.",
      },
      { property: "og:title", content: "لوحة المصاريف — مصاريف العيلة" },
      { property: "og:description", content: "متابعة يومية لمصاريف الأكل والسوبر ماركت." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const expenses = useQuery(expensesQuery);
  const budget = useQuery(budgetQuery);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loading = expenses.isLoading || budget.isLoading;
  const rows = expenses.data ?? [];

  const weekTotal = sumBetween(rows, startOfWeekSat());
  const monthTotal = sumBetween(rows, startOfMonth());
  const monthlyCap = budget.data?.monthly_cap ?? 4000;
  const weeklyCap = budget.data?.weekly_cap ?? 1000;
  const pct = monthlyCap > 0 ? Math.min((monthTotal / monthlyCap) * 100, 100) : 0;
  const remaining = Math.max(monthlyCap - monthTotal, 0);
  const chartData = lastSevenDays(rows);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error("مقدرناش نمسح المصروف");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["expenses"] });
    toast.success("اتمسح");
  }

  if (loading) return <DashboardSkeleton />;

  return (
    <AppShell>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">أهلاً بيك 👋</h1>
          <p className="text-sm text-muted-foreground">ده ملخص مصاريف البيت</p>
        </div>
        {isAdmin ? (
          <Button asChild size="sm">
            <Link to="/log">
              <PlusCircle className="size-4" />
              مصروف جديد
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="مصاريف الأسبوع"
          value={formatEGP(weekTotal)}
          hint={`من ${formatEGP(weeklyCap)}`}
          tone={weekTotal > weeklyCap ? "over" : "ok"}
        />
        <KpiCard
          label="مصاريف الشهر"
          value={formatEGP(monthTotal)}
          hint={`من ${formatEGP(monthlyCap)}`}
          tone={monthTotal > monthlyCap ? "over" : "ok"}
        />
      </div>

      <section className="card-soft mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">حد الميزانية الشهرية</h2>
          <Badge variant={monthTotal > monthlyCap ? "destructive" : "secondary"}>
            {Math.round((monthTotal / (monthlyCap || 1)) * 100)}%
          </Badge>
        </div>
        <Progress value={pct} className="h-3" />
        <p className="mt-3 text-sm text-muted-foreground">
          {monthTotal > monthlyCap
            ? `عدّينا الحد بـ ${formatEGP(monthTotal - monthlyCap)} 😅`
            : `فاضلك ${formatEGP(remaining)} لآخر الشهر`}
        </p>
      </section>

      <section className="card-soft mt-4 p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-bold">مصاريف آخر ٧ أيام</h2>
        </div>
        <div className="h-48 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
              />
              <Tooltip
                cursor={{ fill: "var(--color-muted)" }}
                formatter={(value: number) => [formatEGP(value), "المصروف"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)",
                  fontFamily: "Cairo, sans-serif",
                  fontSize: 12,
                  direction: "rtl",
                }}
              />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.iso}
                    fill={d.total > 0 ? "var(--color-chart-1)" : "var(--color-muted)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-bold">آخر المصاريف</h2>
        {rows.length === 0 ? (
          <EmptyState isAdmin={isAdmin} />
        ) : (
          <ul className="space-y-2">
            {rows.slice(0, 20).map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                isAdmin={isAdmin}
                deleting={deletingId === e.id}
                onDelete={() => handleDelete(e.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function KpiCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "ok" | "over";
}) {
  return (
    <div className="card-soft p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={
          tone === "over"
            ? "mt-1 text-2xl font-extrabold text-destructive"
            : "mt-1 text-2xl font-extrabold text-foreground"
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function ExpenseRow({
  expense,
  isAdmin,
  deleting,
  onDelete,
}: {
  expense: Expense;
  isAdmin: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
  async function openImage() {
    if (!expense.image_url) return;
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(expense.image_url, 60);
    if (error || !data?.signedUrl) {
      toast.error("مقدرناش نفتح الصورة");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  }

  return (
    <li className="card-soft flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{expense.store_name}</p>
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {expense.category}
          </Badge>
        </div>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <CalendarDays className="size-3" />
          {expense.spent_on}
          {expense.note ? ` · ${expense.note}` : ""}
        </p>
      </div>
      <p className="shrink-0 text-sm font-bold">{formatEGP(expense.amount)}</p>
      {expense.image_url ? (
        <Button variant="ghost" size="icon" onClick={openImage} aria-label="شوف الصورة">
          <ImageIcon className="size-4" />
        </Button>
      ) : null}
      {isAdmin ? (
        <>
          <Button variant="ghost" size="icon" asChild aria-label="تعديل">
            <Link to="/log" search={{ id: expense.id }}>
              <Pencil className="size-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={deleting}
            aria-label="مسح"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </>
      ) : null}
    </li>
  );
}

function EmptyState({ isAdmin }: { isAdmin: boolean }) {
  return (
    <div className="card-soft flex flex-col items-center px-6 py-10 text-center">
      <img
        src={emptyIllustration}
        alt=""
        loading="lazy"
        width={816}
        height={816}
        className="mb-4 size-40 object-contain"
      />
      <p className="text-sm font-semibold text-balance-ar">
        لسه مصممين نوفر.. مفيش مصاريف اتسجلت
      </p>
      {isAdmin ? (
        <Button asChild className="mt-4" size="sm">
          <Link to="/log">
            <PlusCircle className="size-4" />
            سجّل أول مصروف
          </Link>
        </Button>
      ) : null}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <AppShell>
      <Skeleton className="mb-5 h-8 w-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-28 rounded-xl" />
      <Skeleton className="mt-4 h-60 rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
    </AppShell>
  );
}
