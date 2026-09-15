import { errorJson } from "../../_lib/auth.js";

// GET /api/photos/photos/<file> - streams an image out of the R2 bucket.
// Auth is enforced by _middleware.js like every other /api/* route, which keeps
// photos private to logged-in users instead of exposing a public R2 bucket.
export async function onRequestGet(context) {
  const { env, params } = context;
  const segments = Array.isArray(params.key) ? params.key : [params.key];
  const key = segments.join("/");
  const object = await env.PHOTOS.get(key);
  if (!object) return errorJson("Poza nu a fost gasita", 404);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=31536000, immutable");
  headers.set("ETag", object.httpEtag);
  return new Response(object.body, { headers });
}
