export default {
  async fetch(request) {
    const url = new URL(request.url);

    // السماح لتطبيق Y.C.B بالاتصال بالخادم
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: corsHeaders()
      });
    }

    // اختبار الخادم
    if (url.pathname === "/api/health") {
      return json({
        status: "ok",
        app: "Y.C.B",
        message: "Y.C.B server is working"
      });
    }

    return json({
      app: "Y.C.B",
      status: "online"
    });
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders()
    }
  });
}
