import { supabase } from "@/integrations/supabase/client";

export type Expense = {
  id: string;
  amount: number;
  store_name: string;
  category: string;
  spent_on: string;
  note: string | null;
  image_url: string | null;
  created_by: string | null;
  created_at: string;
};

export type BudgetSettings = {
  id: string;
  monthly_cap: number;
  weekly_cap: number;
  currency: string;
};

export const CATEGORIES = ["غداء", "سوبر ماركت", "أخرى"] as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "غداء": "var(--color-chart-1)",
  "سوبر ماركت": "var(--color-chart-2)",
  "أخرى": "var(--color-chart-3)",
};

export function formatEGP(value: number) {
  return `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(value)} ج.م`;
}

export function toISODate(date: Date) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 10);
}

/** أول يوم في الأسبوع = السبت */
export function startOfWeekSat(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = (d.getDay() + 1) % 7; // Sat = 0
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export const expensesQuery = {
  queryKey: ["expenses"],
  queryFn: async (): Promise<Expense[]> => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []).map((row) => ({ ...row, amount: Number(row.amount) })) as Expense[];
  },
};

export const budgetQuery = {
  queryKey: ["budget"],
  queryFn: async (): Promise<BudgetSettings | null> => {
    const { data, error } = await supabase
      .from("budget_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return {
      ...data,
      monthly_cap: Number(data.monthly_cap),
      weekly_cap: Number(data.weekly_cap),
    } as BudgetSettings;
  },
};

export function sumBetween(expenses: Expense[], from: Date, to?: Date) {
  const fromISO = toISODate(from);
  const toISO = to ? toISODate(to) : null;
  return expenses
    .filter((e) => e.spent_on >= fromISO && (!toISO || e.spent_on <= toISO))
    .reduce((acc, e) => acc + e.amount, 0);
}

const DAY_LABELS = ["الأحد", "الإتنين", "التلات", "الأربع", "الخميس", "الجمعة", "السبت"];

export function lastSevenDays(expenses: Expense[]) {
  const days: { label: string; total: number; iso: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const iso = toISODate(d);
    days.push({
      iso,
      label: DAY_LABELS[d.getDay()]!,
      total: expenses.filter((e) => e.spent_on === iso).reduce((a, e) => a + e.amount, 0),
    });
  }
  return days;
}
