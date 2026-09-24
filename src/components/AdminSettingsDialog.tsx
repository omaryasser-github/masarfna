import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { budgetQuery } from "@/lib/expenses";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdminSettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const budget = useQuery(budgetQuery);
  const [weekly, setWeekly] = useState("");
  const [monthly, setMonthly] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && budget.data) {
      setWeekly(String(budget.data.weekly_cap));
      setMonthly(String(budget.data.monthly_cap));
    }
  }, [open, budget.data]);

  async function save() {
    const w = Number(weekly);
    const m = Number(monthly);
    if (!(w > 0) || !(m > 0)) {
      toast.error("اكتب أرقام صحيحة أكبر من صفر");
      return;
    }
    setSaving(true);
    const { error } = budget.data
      ? await supabase
          .from("budget_settings")
          .update({ weekly_cap: w, monthly_cap: m })
          .eq("id", budget.data.id)
      : await supabase.from("budget_settings").insert({ weekly_cap: w, monthly_cap: m });
    setSaving(false);
    if (error) {
      toast.error("مقدرناش نحفظ الإعدادات");
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["budget"] });
    toast.success("اتحفظ حد الميزانية");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="text-right">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle>إعدادات المسؤول</DialogTitle>
          <DialogDescription>حدد الحد الأقصى للمصاريف في الأسبوع والشهر.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekly">حد الأسبوع (ج.م)</Label>
            <Input id="weekly" type="number" inputMode="decimal" value={weekly} onChange={(e) => setWeekly(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="monthly">حد الشهر (ج.م)</Label>
            <Input id="monthly" type="number" inputMode="decimal" value={monthly} onChange={(e) => setMonthly(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "بيتحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
