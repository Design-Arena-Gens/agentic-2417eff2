import { NextRequest } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  try {
    const { text, target } = await req.json();
    if (typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ translated: "" }), { headers: { "Content-Type": "application/json" } });
    }
    const tgt = typeof target === "string" ? target : "en";
    // Use LibreTranslate public instance as a demo. Fallback to identity if fails.
    const resp = await fetch("https://libretranslate.de/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text, source: "auto", target: tgt, format: "text" }),
    });
    if (resp.ok) {
      const data: any = await resp.json();
      const translated = data.translatedText ?? text;
      return new Response(JSON.stringify({ translated }), { headers: { "Content-Type": "application/json" } });
    }
  } catch {}
  return new Response(JSON.stringify({ translated: "" }), { headers: { "Content-Type": "application/json" } });
}
