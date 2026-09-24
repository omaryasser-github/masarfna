import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — مصاريف العيلة" },
      { name: "description", content: "سجّل دخولك عشان تتابع مصاريف الأكل والسوبر ماركت بتاعة البيت." },
      { property: "og:title", content: "تسجيل الدخول — مصاريف العيلة" },
      { property: "og:description", content: "سجّل دخولك عشان تتابع مصاريف البيت اليومية." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("مقدرناش ندخّلك", { description: "الإيميل أو الباسورد غلط." });
      return;
    }
    toast.success("أهلاً بيك تاني 👋");
    navigate({ to: "/dashboard", replace: true });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: name },
      },
    });
    setLoading(false);
    if (error) {
      toast.error("مقدرناش نعمل الحساب", { description: error.message });
      return;
    }
    if (data.session) {
      toast.success("تمام! الحساب اتعمل");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("بصّ على إيميلك", {
        description: "بعتنالك لينك تأكيد، اضغط عليه وبعدين سجّل دخول.",
      });
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Wallet className="size-7" />
          </span>
          <h1 className="text-2xl font-extrabold">مصاريف العيلة</h1>
          <p className="mt-1 text-sm text-muted-foreground text-balance-ar">
            سجّل مصاريف الأكل والسوبر ماركت، وشوف فلوسك رايحة فين.
          </p>
        </div>

        <div className="card-soft p-5">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">دخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">الإيميل</Label>
                  <Input
                    id="email"
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">الباسورد</Label>
                  <Input
                    id="password"
                    type="password"
                    dir="ltr"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "ثانية واحدة..." : "يلا ندخل"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">اسمك</Label>
                  <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="عمر"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">الإيميل</Label>
                  <Input
                    id="email2"
                    type="email"
                    dir="ltr"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">الباسورد</Label>
                  <Input
                    id="password2"
                    type="password"
                    dir="ltr"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "ثانية واحدة..." : "اعمل حساب"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  أول حساب يتسجل بيبقى المسؤول، وأي حد بعده بيشوف بس.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
