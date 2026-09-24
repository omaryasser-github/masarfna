import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Clock, MapPin, Phone, Receipt, Star, UtensilsCrossed, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { expensesQuery } from "@/lib/expenses";
import { cn } from "@/lib/utils";

type Restaurant = {
  id: string;
  name: string;
  category: string;
  hotline: string | null;
  location: string | null;
  menu_url: string | null;
  is_preset: boolean;
  preset_title: string | null;
  preset_description: string | null;
};

const TAGS = ["الكل", "مشويات", "وجبات سريعة", "شعبي وفطار", "فطاير ومخبوزات", "سوبر ماركت وثلاجة"] as const;

const restaurantsQuery = {
  queryKey: ["restaurants"],
  queryFn: async (): Promise<Restaurant[]> => {
    const { data, error } = await supabase.from("restaurants" as never).select("*").order("created_at");
    if (error) throw error;
    return (data ?? []) as unknown as Restaurant[];
  },
};

export const Route = createFileRoute("/_authenticated/food")({
  head: () => ({
    meta: [
      { title: "ناكل إيه النهارده؟ — مصاريف العيلة" },
      { name: "description", content: "اختار الأكل من مطاعمنا المفضلة، كلّمهم، وسجّل الفاتورة على طول." },
      { property: "og:title", content: "ناكل إيه النهارده؟ — مصاريف العيلة" },
      { property: "og:description", content: "مطاعمنا وأوردراتنا الثابتة في مكان واحد." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FoodPage,
});

function expenseCategory(c: string) {
  return c === "سوبر ماركت وثلاجة" ? "سوبر ماركت" : c === "فطاير ومخبوزات" ? "أخرى" : "غداء";
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ar-EG", { day: "numeric", month: "short" }).format(new Date(iso));
}

function FoodPage() {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [tag, setTag] = useState<string>("الكل");
  const [menu, setMenu] = useState<Restaurant | null>(null);
  const restaurants = useQuery(restaurantsQuery);
  const expenses = useQuery(expensesQuery);

  const lastOrdered = (name: string) =>
    expenses.data?.find((e) => e.store_name.trim() === name.trim())?.spent_on ?? null;

  const order = (r: Restaurant) =>
    navigate({ to: "/log", search: { store: r.name, category: expenseCategory(r.category) } });

  const list = (restaurants.data ?? []).filter((r) => tag === "الكل" || r.category === tag);
  const presets = (restaurants.data ?? []).filter((r) => r.is_preset);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold">ناكل إيه النهارده؟</h1>
      <p className="mb-4 text-sm text-muted-foreground">اختار، كلّمهم، وسجّل الفاتورة على طول.</p>

      {restaurants.isError ? (
        <div className="card-soft rounded-xl border border-destructive/30 bg-card p-5 text-center">
          <p className="font-semibold">حصلت مشكلة وإحنا بنجيب المطاعم 😕</p>
          <Button variant="outline" className="mt-3" onClick={() => restaurants.refetch()}>
            جرّب تاني
          </Button>
        </div>
      ) : restaurants.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          {presets.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 font-bold">
                <Star className="size-4 text-primary" /> أوردراتنا الثابتة
              </h2>
              <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                {presets.map((r) => (
                  <div key={r.id} className="card-soft w-64 shrink-0 snap-start rounded-xl border border-border bg-card p-4">
                    <p className="font-bold">{r.preset_title ?? r.name}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.preset_description}</p>
                    <div className="mt-3 flex gap-2">
                      <HotlineButton hotline={r.hotline} />
                      {isAdmin && (
                        <Button size="sm" className="flex-1" onClick={() => order(r)}>
                          اطلب وسجّل
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist">
            {TAGS.map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tag === t}
                onClick={() => setTag(t)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
                  tag === t
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
              <UtensilsCrossed className="mx-auto mb-2 size-8" />
              مفيش أماكن في القسم ده لسه
            </div>
          ) : (
            <div className="space-y-3">
              {list.map((r) => {
                const last = lastOrdered(r.name);
                return (
                  <article key={r.id} className="card-soft rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-bold">{r.name}</h3>
                        <Badge variant="secondary" className="mt-1">{r.category}</Badge>
                      </div>
                      {last ? (
                        <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
                          <Clock className="size-3" /> آخر طلب {formatDate(last)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">لسه ماطلبناش</span>
                      )}
                    </div>
                    {r.location && (
                      <p className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-4" /> {r.location}
                      </p>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <HotlineButton hotline={r.hotline} />
                      <Button variant="outline" size="sm" onClick={() => setMenu(r)}>
                        <BookOpen className="size-4" /> شوف المنيو
                      </Button>
                    </div>
                    {isAdmin && (
                      <Button className="mt-2 w-full" onClick={() => order(r)}>
                        <Receipt className="size-4" /> اطلب وسجل الفاتورة
                      </Button>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <Dialog open={!!menu} onOpenChange={(o) => !o && setMenu(null)}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader className="text-right sm:text-right">
            <DialogTitle>منيو {menu?.name}</DialogTitle>
            <DialogDescription>{menu?.category}</DialogDescription>
          </DialogHeader>
          {menu?.menu_url ? (
            <img src={menu.menu_url} alt={`منيو ${menu.name}`} className="max-h-[70vh] w-full rounded-lg object-contain" />
          ) : (
            <p className="py-8 text-center text-muted-foreground">المنيو لسه مش متضاف 📋</p>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function HotlineButton({ hotline }: { hotline: string | null }) {
  if (!hotline)
    return (
      <Button variant="outline" size="sm" disabled className="flex-1">
        <Phone className="size-4" /> مفيش رقم
      </Button>
    );
  return (
    <Button asChild variant="outline" size="sm" className="flex-1">
      <a href={`tel:${hotline}`}>
        <Phone className="size-4" /> {hotline}
      </a>
    </Button>
  );
}
