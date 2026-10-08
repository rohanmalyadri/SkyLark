"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { removeAvatarAction, uploadAvatarAction } from "@/app/actions/candidate";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useAction } from "@/lib/hooks/use-action";

const SIZE = 256;
const ACCEPT = "image/png,image/jpeg,image/webp";

/** Centre-crops to a square and re-encodes in the browser: small uploads, and phone EXIF/GPS data is dropped. */
async function toSquare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const encode = (type: string) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, 0.9));
  // Safari can't encode WebP; fall back to JPEG.
  const webp = await encode("image/webp");
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await encode("image/jpeg");
  if (!jpeg) throw new Error("Couldn't process that image");
  return jpeg;
}

export function AvatarField({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const upload = useAction(uploadAvatarAction, { onSuccess: () => setPreview(null) });
  const remove = useAction(removeAvatarAction);
  const fromGoogle = !!avatarUrl && /googleusercontent\.com/.test(avatarUrl);

  const choose = async (file: File | undefined) => {
    setError(null);
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Use a PNG, JPEG or WebP image.");
    if (file.size > 15 * 1024 * 1024) return setError("That image is too large (15 MB max before resizing).");
    try {
      const blob = await toSquare(file);
      setPreview(URL.createObjectURL(blob));
      const fd = new FormData();
      fd.set("file", new File([blob], `avatar.${blob.type === "image/webp" ? "webp" : "jpg"}`, { type: blob.type }));
      const res = await upload.execute(fd);
      if (!res.ok) setPreview(null);
    } catch {
      setError("Couldn't read that image. Try a different file.");
    } finally {
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <UserAvatar name={name || "?"} src={preview ?? avatarUrl} className={`size-16 text-base ${upload.pending ? "opacity-60" : ""}`} />
      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" loading={upload.pending} onClick={() => input.current?.click()}>
            <Camera /> {avatarUrl ? "Replace photo" : "Upload photo"}
          </Button>
          {avatarUrl && (
            <Button type="button" size="sm" variant="ghost" loading={remove.pending} onClick={() => void remove.execute()}>
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-subtle">{fromGoogle ? "Using your Google profile photo. Upload one to replace it." : "Square photos work best. PNG, JPEG or WebP."}</p>
        {error && (
          <p role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT} className="sr-only" aria-label="Upload profile photo" onChange={(e) => void choose(e.target.files?.[0])} />
    </div>
  );
}
