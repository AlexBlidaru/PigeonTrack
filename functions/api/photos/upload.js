import { json, errorJson } from "../../_lib/auth.js";

const MAX_BYTES = 7 * 1024 * 1024; // 7 MB safety cap (client already compresses well below this)

// POST /api/photos/upload - multipart/form-data with a "photo" file field.
export async function onRequestPost(context) {
  const { request, env } = context;
  let form;
  try {
    form = await request.formData();
  } catch {
    return errorJson("Cerere invalida");
  }
  const file = form.get("photo");
  if (!file || typeof file === "string") return errorJson("Lipseste fisierul poza");
  if (file.size > MAX_BYTES) return errorJson("Poza este prea mare (limita 7 MB)");
  if (!file.type || !file.type.startsWith("image/")) return errorJson("Fisierul trebuie sa fie o imagine");

  const ext = file.type === "image/png" ? "png" : "jpg";
  const key = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.PHOTOS.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  return json({ key }, { status: 201 });
}
