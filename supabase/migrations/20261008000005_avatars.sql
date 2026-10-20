-- Public bucket for profile photos. Uploads are validated and written server-side with the
-- service role; objects are keyed "<user-id>/avatar" and only images are accepted.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
