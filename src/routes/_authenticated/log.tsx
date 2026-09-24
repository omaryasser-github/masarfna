import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES, expensesQuery, toISODate, type Expense } from "@/lib/expenses";

const searchSchema = z.object({ id: z.string().optional(), store: z.string().optional(), category: z.string().optional() });

export const Route = createFileRoute("/_authenticated/log")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "سجّل مصروف — مصاريف العيلة" },
      { name: "description", content: "ضيف مصروف جديد: المبلغ، المحل، النوع، التاريخ وصورة الفاتورة." },
      { property: "og:title", content: "سجّل مصروف — مصاريف العيلة" },
      { property: "og:description", content: "ضيف مصروف جديد في ثواني." },
    ],
  }),
  component: LogExpensePage,
});

function LogExpensePage() {
  const { id, store: presetStore, category: presetCategory } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin, loading: authLoading, user } = useAuth();

  const { data: expenses } = useQuery(expensesQuery);
  const editing: Expense | undefined = id ? expenses?.find((e) => e.id === id) : undefined;

  const [amount, setAmount] = useState("");
  const [store, setStore] = useState(presetStore ?? "");
  const [category, setCategory] = useState<string>(
    presetCategory && (CATEGORIES as readonly string[]).includes(presetCategory) ? presetCategory : CATEGORIES[0],
  );
  const [date, setDate] = useState(toISODate(new Date()));
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setAmount(String(editing.amount));
    setStore(editing.store_name);
    setCategory(editing.category);
    setDate(editing.spent_on);
    setNote(editing.note ?? "");
  }, [editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value <= 0) {
      toast.error("اكتب مبلغ صحيح");
      return;
    }
    setSaving(true);
    try {
      let imagePath = editing?.image_url ?? null;
      if (file) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${user?.id ?? "unknown"}/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("receipts")
          .upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        imagePath = path;
      }

      const payload = {
        amount: value,
        store_name: store.trim(),
        category,
        spent_on: date,
        note: note.trim() || null,
        image_url: imagePath,
        created_by: user?.id ?? null,
      };

      const { error } = editing
        ? await supabase.from("expenses").update(payload).eq("id", editing.id)
        : await supabase.from("expenses").insert(payload);
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success(editing ? "اتعدّل ✅" : "اتسجل ✅", {
        description: `${value} ج.م · ${store.trim()}`,
      });
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error("مقدرناش نحفظ المصروف", {
        description: err instanceof Error ? err.message : "جرّب تاني بعد شوية.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (!authLoading && !isAdmin) {
    return (
      <AppShell>
        <div className="card-soft p-6 text-center">
          <h1 className="text-lg font-bold">الصفحة دي للمسؤول بس</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            إنت تقدر تتفرج على اللوحة، بس تسجيل المصاريف للمسؤول.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-extrabold">
        {editing ? "تعديل مصروف" : "سجّل مصروف جديد"}
      </h1>

      <form onSubmit={onSubmit} className="card-soft space-y-5 p-5">
        <div className="space-y-2">
          <Label htmlFor="amount">المبلغ (ج.م)</Label>
          <Input
            id="amount"
            type="number"
            inputMode="decimal"
            min="1"
            step="0.5"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="350"
            className="text-lg font-bold"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="store">المطعم / المحل</Label>
          <Input
            id="store"
            required
            value={store}
            onChange={(e) => setStore(e.target.value)}
            placeholder="Hadhramout"
          />
        </div>

        <div className="space-y-2">
          <Label>النوع</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="اختار النوع" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">التاريخ</Label>
          <Input
            id="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">ملاحظة (اختياري)</Label>
          <Textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="مثلاً: غدا الجمعة للعيلة"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="image" className="flex items-center gap-2">
            <ImagePlus className="size-4" /> صورة الفاتورة (اختياري)
          </Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <p className="text-xs text-muted-foreground">{file.name}</p>
          ) : editing?.image_url ? (
            <p className="text-xs text-muted-foreground">في صورة متسجلة بالفعل</p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button type="submit" className="flex-1" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {editing ? "احفظ التعديل" : "سجّل المصروف"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate({ to: "/dashboard" })}
            disabled={saving}
          >
            إلغاء
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
