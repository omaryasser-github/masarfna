import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Action = () => Promise<unknown> | unknown;
const Ctx = createContext<(action: Action) => void>(() => {});

export function ConfirmDeleteProvider({ children }: { children: ReactNode }) {
  const [action, setAction] = useState<Action | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback((a: Action) => setAction(() => a), []);

  const run = async () => {
    if (!action) return;
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  return (
    <Ctx.Provider value={confirm}>
      {children}
      <Dialog open={!!action} onOpenChange={(o) => !o && !busy && setAction(null)}>
        <DialogContent dir="rtl" className="max-w-sm text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-7 text-destructive" />
          </div>
          <DialogHeader className="text-center sm:text-center">
            <DialogTitle className="text-center">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-center">
              هل أنت متأكد من مسح هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setAction(null)} disabled={busy}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={run} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} تأكيد الحذف
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Ctx.Provider>
  );
}

export function useConfirmDelete() {
  return useContext(Ctx);
}
