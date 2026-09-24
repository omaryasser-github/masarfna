create policy "Authenticated can view receipts" on storage.objects
for select to authenticated using (bucket_id = 'receipts');

create policy "Admins can upload receipts" on storage.objects
for insert to authenticated with check (bucket_id = 'receipts' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can update receipts" on storage.objects
for update to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete receipts" on storage.objects
for delete to authenticated using (bucket_id = 'receipts' and public.has_role(auth.uid(), 'admin'));