export async function onRequest(context) {
  const { request, env } = context;
  const gasUrl = env.GAS_URL;

  if (!gasUrl) {
    return new Response("Error: GAS_URL belum di-set di Cloudflare!", { status: 500 });
  }

  // Siapkan URL tujuan (Google Apps Script)
  const targetUrl = new URL(gasUrl);
  
  // Kalau ada parameter di URL web (misal ?id=123), kita oper juga ke GAS
  const { searchParams } = new URL(request.url);
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  // Ambil method (GET atau POST) dan body (kalau ada)
  const method = request.method;
  const contentType = request.headers.get("content-type");
  
  let options = {
    method: method,
    headers: {}
  };

  // Kalau POST (saat submit form), kita ambil body-nya
  if (method === "POST") {
    options.body = await request.text();
    if (contentType) {
      options.headers["Content-Type"] = contentType;
    }
  }

  try {
    const response = await fetch(targetUrl.toString(), options);
    const result = await response.text();
    
    return new Response(result, {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ status: "error", message: err.message }), { status: 500 });
  }
}
