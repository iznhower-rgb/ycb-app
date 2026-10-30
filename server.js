import http from "node:http";
import worker from "./worker.js";

const PORT = 3000;
const HOST = "0.0.0.0";

const env = {
  ESPN_LEAGUES: process.env.ESPN_LEAGUES || "eng.1,esp.1,ger.1,ita.1,fra.1,ned.1,por.1,bel.1,sco.1,tur.1,usa.1,mex.1,bra.1,arg.1",
  THESPORTSDB_API_KEY: process.env.THESPORTSDB_API_KEY || "123",
  YCB_PROVIDER_TIMEOUT_MS: process.env.YCB_PROVIDER_TIMEOUT_MS || "20000",
  BSD_API_KEY: process.env.BSD_API_KEY || "108218eab3e619463be3a7a7feae2965f1303ff0",
  ...process.env
};

const server = http.createServer(async (req, res) => {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || `localhost:${PORT}`;
    const url = new URL(req.url, `${protocol}://${host}`);

    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = chunks.length > 0 && req.method !== "GET" && req.method !== "HEAD"
      ? Buffer.concat(chunks)
      : undefined;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          for (const v of value) headers.append(key, v);
        } else {
          headers.set(key, value);
        }
      }
    }

    const webRequest = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
      duplex: body ? "half" : undefined
    });

    const webResponse = await worker.fetch(webRequest, env);

    res.statusCode = webResponse.status;
    webResponse.headers.forEach((val, key) => {
      res.setHeader(key, val);
    });

    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    console.error("Server error:", err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: err.message || "Internal server error" }));
    } else {
      res.end();
    }
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Y.C.B Prediction Engine running on http://${HOST}:${PORT}`);
});
