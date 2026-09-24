CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  hotline text,
  location text,
  menu_url text,
  is_preset boolean NOT NULL DEFAULT false,
  preset_title text,
  preset_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view restaurants" ON public.restaurants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert restaurants" ON public.restaurants FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can update restaurants" ON public.restaurants FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins can delete restaurants" ON public.restaurants FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON public.restaurants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.restaurants (name, category, is_preset, preset_title, preset_description) VALUES
('حضرموت','مشويات',true,'غدا حضرموت المتين','رز بسمتي ونص فرخة مندي وسلطات.. غدا يقفل اليوم'),
('كرم الشام','وجبات سريعة',true,'سهرة كرم الشام','شاورما وفتة وبطاطس للسهرة قدام الماتش'),
('جاد','شعبي وفطار',false,null,null),
('العتر','شعبي وفطار',false,null,null),
('دهب','فطاير ومخبوزات',false,null,null),
('قاصد كريم','سوبر ماركت وثلاجة',false,null,null),
('مترو','سوبر ماركت وثلاجة',false,null,null),
('خير زمان','سوبر ماركت وثلاجة',false,null,null),
('البركة','سوبر ماركت وثلاجة',false,null,null);