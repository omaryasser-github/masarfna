import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const RESTAURANT_CATEGORIES = ["مشويات", "وجبات سريعة", "شعبي وفطار", "فطاير ومخبوزات", "سوبر ماركت وثلاجة"] as const;

export type RestaurantRow = {
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

export async function uploadMenuImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `menus/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("receipts").upload(path, file, { upsert: false });
  if (error) throw error;
  return path;
}

export async function resolveMenuUrl(value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//.test(value)) return value;
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(value, 3600);
  if (error) return null;
  return data.signedUrl;
}

export function RestaurantDialog({
  open,
  onOpenChange,
  restaurant,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurant: RestaurantRow | null;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(RESTAURANT_CATEGORIES[0]);
  const [hotline, setHotline] = useState("");
  const [location, setLocation] = useState("");
  const [menuUrl, setMenuUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(restaurant?.name ?? "");
    setCategory(restaurant?.category ?? RESTAURANT_CATEGORIES[0]);
    setHotline(restaurant?.hotline ?? "");
    setLocation(restaurant?.location ?? "");
    setMenuUrl(restaurant?.menu_url && /^https?:\/\//.test(restaurant.menu_url) ? restaurant.menu_url : "");
    setFile(null);
  }, [open, restaurant]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("اكتب اسم المكان");
    setSaving(true);
    try {
      let menu: string | null = menuUrl.trim() || null;
      if (file) menu = await uploadMenuImage(file);
      else if (!menu && restaurant?.menu_url && !/^https?:\/\//.test(restaurant.menu_url)) menu = restaurant.menu_url;
      const payload = {
        name: name.trim(),
        category,
        hotline: hotline.trim() || null,
        location: location.trim() || null,
        menu_url: menu,
      };
      const { error } = restaurant
        ? await supabase.from("restaurants").update(payload).eq("id", restaurant.id)
        : await supabase.from("restaurants").insert(payload);
      if (error) throw error;
      toast.success(restaurant ? "اتعدّل المكان" : "اتضاف المكان");
      qc.invalidateQueries({ queryKey: ["restaurants"] });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("حصلت مشكلة في الحفظ، جرّب تاني");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto text-right">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>{restaurant ? "تعديل المكان" : "إضافة مطعم/سوبرماركت"}</DialogTitle>
          <DialogDescription>البيانات دي هتظهر لكل العيلة.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="r-name">اسم المكان</Label>
            <Input id="r-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-cat">النوع</Label>
            <select
              id="r-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
            >
              {RESTAURANT_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-hot">رقم الهوتلاين</Label>
            <Input id="r-hot" dir="ltr" inputMode="tel" className="text-right" value={hotline} onChange={(e) => setHotline(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-loc">الفرع/العنوان</Label>
            <Input id="r-loc" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-menu">لينك المنيو</Label>
            <Input id="r-menu" dir="ltr" placeholder="https://..." value={menuUrl} onChange={(e) => setMenuUrl(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="r-file">أو ارفع صورة المنيو</Label>
            <Input id="r-file" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {restaurant?.menu_url && !menuUrl && !file && (
              <p className="text-xs text-muted-foreground">فيه منيو محفوظ بالفعل.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "بنحفظ..." : "حفظ"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
