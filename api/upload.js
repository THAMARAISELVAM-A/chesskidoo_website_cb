// api/upload.js
// ChessKidoo Academy High-Performance File & Image Upload Endpoint

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey"
};

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    if (res.status) return res.status(200).json({});
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    if (res.status) return res.status(405).json({ error: "Method not allowed" });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: corsHeaders
    });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "https://vseombfkrvpffnpgbsnk.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const imgbbKey = process.env.IMGBB_API_KEY || "9b12854e4e943485c2c1143c65e8a75e"; // Default fallback key

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (_) {}
    }
    if (!body && typeof req.json === "function") {
      body = await req.json().catch(() => ({}));
    }

    const image = body?.image || body?.file || body?.data;
    const filename = body?.filename || `file_${Date.now()}.bin`;

    if (!image) {
      const err = { success: false, error: "No file or image data provided" };
      if (res.status) return res.status(400).json(err);
      return new Response(JSON.stringify(err), { status: 400, headers: corsHeaders });
    }

    // Route 1: Try ImgBB if it looks like an image
    const isImage = /\.(png|jpe?g|webp|gif|svg)$/i.test(filename) || typeof image === "string";
    if (isImage && imgbbKey) {
      try {
        const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;
        const formData = new URLSearchParams();
        formData.append("image", cleanBase64);

        const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString()
        });

        if (imgbbRes.ok) {
          const imgData = await imgbbRes.json();
          if (imgData?.data?.url) {
            const out = { success: true, data: { url: imgData.data.url } };
            if (res.status) return res.status(200).json(out);
            return new Response(JSON.stringify(out), { status: 200, headers: corsHeaders });
          }
        }
      } catch (err) {
        console.warn("[Upload API] ImgBB attempt note:", err.message);
      }
    }

    // Route 2: Upload to Supabase Storage
    if (supabaseKey) {
      try {
        const cleanBase64 = image.includes("base64,") ? image.split("base64,")[1] : image;
        const buffer = Buffer.from(cleanBase64, "base64");
        const ext = filename.split(".").pop() || "bin";
        const path = `uploads/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        let mimeType = "application/octet-stream";
        if (ext === "pdf") mimeType = "application/pdf";
        else if (ext === "png") mimeType = "image/png";
        else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
        else if (ext === "webp") mimeType = "image/webp";

        // Try 'documents' or 'homework_attachments' bucket
        for (const bucket of ["documents", "homework_attachments"]) {
          const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
            method: "POST",
            headers: {
              apikey: supabaseKey,
              Authorization: `Bearer ${supabaseKey}`,
              "Content-Type": mimeType
            },
            body: buffer
          });

          if (uploadRes.ok) {
            const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
            const out = { success: true, data: { url: publicUrl } };
            if (res.status) return res.status(200).json(out);
            return new Response(JSON.stringify(out), { status: 200, headers: corsHeaders });
          }
        }
      } catch (err) {
        console.warn("[Upload API] Supabase storage note:", err.message);
      }
    }

    // Route 3: Return Data URL if reasonably sized (< 4MB)
    if (typeof image === "string" && image.length < 5 * 1024 * 1024) {
      const dataUrl = image.startsWith("data:") ? image : `data:application/octet-stream;base64,${image}`;
      const out = { success: true, data: { url: dataUrl } };
      if (res.status) return res.status(200).json(out);
      return new Response(JSON.stringify(out), { status: 200, headers: corsHeaders });
    }

    const fail = { success: false, error: "Upload failed across all storage providers" };
    if (res.status) return res.status(500).json(fail);
    return new Response(JSON.stringify(fail), { status: 500, headers: corsHeaders });
  } catch (e) {
    console.error("[Upload API] Handler error:", e);
    const err = { success: false, error: e.message || "Upload processing error" };
    if (res.status) return res.status(500).json(err);
    return new Response(JSON.stringify(err), { status: 500, headers: corsHeaders });
  }
}
