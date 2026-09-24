import { createFileRoute, Link } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useConfirmDelete } from "@/components/ConfirmDelete";
import { ArrowRight, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { OrderCard } from "@/components/OrderCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import type { Expense } from "@/lib/expenses";

const PAGE = 15;

export const Route = createFileRoute("/_authenticated/orders")({
  head: () => ({
    meta: [
      { title: "سجل الأوردرات السابقة — مصاريف العيلة" },
      { name: "description", content: "كل الأوردرات والمصاريف اللي اتسجلت قبل كده." },
      { property: "og:title", content: "سجل الأوردرات السابقة — مصاريف العيلة" },
      { property: "og:description", content: "كل الأوردرات اللي اتسجلت، من الأحدث للأقدم." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OrdersPage,
});

function OrdersPage() {
  const { isAdmin } = useAuth();
  const q = useInfiniteQuery({
    queryKey: ["orders-history"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<Expense[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("spent_on", { ascending: false })
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + PAGE - 1);
      if (error) throw error;
      return (data ?? []).map((r) => ({ ...r, amount: Number(r.amount) })) as Expense[];
    },
    getNextPageParam: (last, all) => (last.length < PAGE ? undefined : all.length * PAGE),
  });
  const orders = q.data?.pages.flat() ?? [];
  const qc = useQueryClient();
  const confirmDelete = useConfirmDelete();
  const remove = (id: string) =>
    confirmDelete(async () => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) { toast.error("مقدرناش نمسح الأوردر"); return; }
      toast.success("اتمسح");
      qc.invalidateQueries({ queryKey: ["orders-history"] });
      qc.invalidateQueries({ queryKey: ["expenses"] });
    });

  return (
    <AppShell>
      <Link to="/food" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowRight className="size-4" /> رجوع لناكل إيه
      </Link>
      <h1 className="mb-4 text-2xl font-bold">سجل الأوردرات السابقة</h1>
      {q.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-5 text-center">
          <p className="font-semibold">حصلت مشكلة وإحنا بنجيب الأوردرات 😕</p>
          <Button variant="outline" className="mt-3" onClick={() => q.refetch()}>جرّب تاني</Button>
        </div>
      ) : q.isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
          <Receipt className="mx-auto mb-2 size-8" />
          لم يتم تسجيل أوردرات بعد
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => <OrderCard key={o.id} order={o} isAdmin={isAdmin} onDelete={() => remove(o.id)} />)}
          {q.hasNextPage && (
            <Button variant="outline" className="w-full" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
              {q.isFetchingNextPage ? "بنحمّل..." : "حمّل كمان"}
            </Button>
          )}
        </div>
      )}
    </AppShell>
  );
}
