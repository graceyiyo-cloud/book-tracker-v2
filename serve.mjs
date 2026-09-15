import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};
http
  .createServer((req, res) => {
    try {
      const route = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        root,
        "." + (route === "/" ? "/index.html" : route),
      );
      if (
        !file.startsWith(root + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.setHeader(
        "Content-Type",
        (mime[path.extname(file)] || "application/octet-stream") +
          (path.extname(file) === ".png" ? "" : "; charset=utf-8"),
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(fs.readFileSync(file));
    } catch {
      res.writeHead(400);
      res.end("Bad request");
    }
  })
  .listen(Number(process.env.PORT) || 8770, "127.0.0.1", () =>
    console.log(
      "Reading Journal: http://127.0.0.1:8770/  |  Demo: http://127.0.0.1:8770/?demo=1",
    ),
  );
