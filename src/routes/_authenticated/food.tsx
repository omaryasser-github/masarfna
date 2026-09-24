import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RestaurantDialog, resolveMenuUrl, uploadMenuImage, type RestaurantRow } from "@/components/RestaurantDialog";
import { Clock, MapPin, Phone, Receipt, History, UtensilsCrossed, BookOpen, Plus, Pencil, Trash2, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { OrderCard } from "@/components/OrderCard";
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
    const { data, error } = await supabase.from("restaurants").select("*").order("created_at");
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
  const [editing, setEditing] = useState<RestaurantRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const qc = useQueryClient();
  const restaurants = useQuery(restaurantsQuery);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: Restaurant) => { setEditing(r); setFormOpen(true); };
  const remove = async (r: Restaurant) => {
    if (!window.confirm(`متأكد إنك عايز تمسح "${r.name}"؟`)) return;
    const { error } = await supabase.from("restaurants").delete().eq("id", r.id);
    if (error) { toast.error("ماقدرناش نمسحه، جرّب تاني"); return; }
    toast.success("اتمسح");
    qc.invalidateQueries({ queryKey: ["restaurants"] });
    if (menu?.id === r.id) setMenu(null);
  };
  const expenses = useQuery(expensesQuery);

  const lastOrdered = (name: string) =>
    expenses.data?.find((e) => e.store_name.trim() === name.trim())?.spent_on ?? null;

  const order = (r: Restaurant) =>
    navigate({ to: "/log", search: { store: r.name, category: expenseCategory(r.category) } });

  const list = (restaurants.data ?? []).filter((r) => tag === "الكل" || r.category === tag);
  const allOrders = expenses.data ?? [];
  const recent = allOrders.slice(0, 3);
  const moreCount = Math.max(0, allOrders.length - 3);

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-bold">ناكل إيه النهارده؟</h1>
      <p className="mb-4 text-sm text-muted-foreground">اختار، كلّمهم، وسجّل الفاتورة على طول.</p>
      {isAdmin && (
        <Button className="mb-5 w-full" size="lg" onClick={openAdd}>
          <Plus className="size-5" /> إضافة مطعم/سوبرماركت
        </Button>
      )}

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
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 font-bold">
              <History className="size-4 text-primary" /> أحدث الطلبات
            </h2>
            {expenses.isLoading ? (
              <div className="-mx-4 flex gap-3 overflow-hidden px-4">
                {[0, 1].map((i) => <Skeleton key={i} className="h-32 w-64 shrink-0 rounded-xl" />)}
              </div>
            ) : recent.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                لم يتم تسجيل أوردرات بعد
              </p>
            ) : (
              <>
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                  {recent.map((o) => (
                    <OrderCard key={o.id} order={o} isAdmin={isAdmin} className="w-64 shrink-0 snap-start" />
                  ))}
                </div>
                {moreCount > 0 && (
                  <Button asChild variant="ghost" size="sm" className="mt-1 w-full text-primary">
                    <Link to="/orders">عرض المزيد (+{moreCount.toLocaleString("ar-EG")})</Link>
                  </Button>
                )}
              </>
            )}
          </section>

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
                      <div className="flex flex-col items-end gap-2">
                      {last ? (
                        <span className="flex items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs text-accent-foreground">
                          <Clock className="size-3" /> آخر طلب {formatDate(last)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">لسه ماطلبناش</span>
                      )}
                      {isAdmin && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" aria-label="تعديل" onClick={() => openEdit(r)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label="حذف" onClick={() => remove(r)}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      )}
                      </div>
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

      <MenuViewer restaurant={menu} isAdmin={isAdmin} onClose={() => setMenu(null)} onUploaded={(url) => setMenu((m) => (m ? { ...m, menu_url: url } : m))} />
      <RestaurantDialog open={formOpen} onOpenChange={setFormOpen} restaurant={editing} />
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

function MenuViewer({
  restaurant,
  isAdmin,
  onClose,
  onUploaded,
}: {
  restaurant: Restaurant | null;
  isAdmin: boolean;
  onClose: () => void;
  onUploaded: (path: string) => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!restaurant?.menu_url) return;
    setLoading(true);
    resolveMenuUrl(restaurant.menu_url).then((u) => {
      if (!cancelled) { setSrc(u); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [restaurant?.menu_url]);

  const upload = async (file: File) => {
    if (!restaurant) return;
    setUploading(true);
    try {
      const path = await uploadMenuImage(file);
      const { error } = await supabase.from("restaurants").update({ menu_url: path }).eq("id", restaurant.id);
      if (error) throw error;
      toast.success("اترفع المنيو");
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      onUploaded(path);
    } catch (e) {
      console.error(e);
      toast.error("ماقدرناش نرفع المنيو، جرّب تاني");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={!!restaurant} onOpenChange={(o) => !o && onClose()}>
      <DialogContent dir="rtl" className="flex h-[100dvh] max-w-none flex-col gap-3 rounded-none border-0 bg-background p-4 text-right sm:h-[95vh] sm:max-w-3xl sm:rounded-xl">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>منيو {restaurant?.name}</DialogTitle>
          <DialogDescription>{restaurant?.category}</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg bg-muted/40">
          {loading ? (
            <Skeleton className="h-full w-full" />
          ) : src ? (
            <img src={src} alt={`منيو ${restaurant?.name}`} className="max-h-full w-full object-contain" />
          ) : (
            <div className="p-6 text-center">
              <BookOpen className="mx-auto mb-3 size-12 text-muted-foreground" />
              <p className="font-semibold">لم يتم إضافة المنيو بعد</p>
              {isAdmin && (
                <>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                  <Button className="mt-4" onClick={() => fileRef.current?.click()} disabled={uploading}>
                    <ImagePlus className="size-4" /> {uploading ? "بنرفع..." : "ارفع المنيو"}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
