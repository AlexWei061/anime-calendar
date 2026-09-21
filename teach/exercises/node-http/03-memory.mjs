import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

const anime = [
  { id: "aurora", title: "极光放映室", episodes: 12 },
  { id: "orbit", title: "轨道放映室", episodes: 6 },
  { id: "comet", title: "彗星日记", episodes: 3 },
];

function sendJson(response, status, value, headers = {}) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(value));
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes <= 4096) chunks.push(chunk);
  }
  if (bytes > 4096) throw { status: 413, message: "正文不能超过 4096 bytes" };
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw { status: 400, message: "正文必须是有效 JSON" };
  }
}

export function createMemoryServer() {
  const watched = new Set();
  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://127.0.0.1");
      const allowed = url.pathname === "/api/watched" ? "GET, PUT"
        : ["/health", "/api/anime"].includes(url.pathname) ? "GET" : null;
      if (allowed === null) return sendJson(response, 404, { error: "找不到这个接口" });
      if (!allowed.split(", ").includes(request.method)) {
        return sendJson(response, 405, { error: "请求方法不支持" }, { Allow: allowed });
      }
      if (url.pathname === "/health") return sendJson(response, 200, { ok: true });
      if (url.pathname === "/api/anime") {
        const title = (url.searchParams.get("title") ?? "").trim();
        return sendJson(response, 200, { anime: anime.filter((item) => item.title.includes(title)) });
      }
      if (request.method === "GET") {
        return sendJson(response, 200, { watched: [...watched] });
      }
      const contentType = request.headers["content-type"]?.split(";")[0].trim().toLowerCase();
      if (contentType !== "application/json") {
        return sendJson(response, 415, { error: "Content-Type 必须是 application/json" });
      }
      const body = await readJson(request);
      const item = anime.find((entry) => entry.id === body?.animeId);
      if (!body || Array.isArray(body) || !item || !Number.isInteger(body.episode)
        || body.episode < 1 || body.episode > item.episodes || typeof body.watched !== "boolean") {
        return sendJson(response, 400, { error: "需要合法的 animeId、episode 整数与 watched 布尔值" });
      }
      const key = `${body.animeId}:${body.episode}`;
      if (body.watched) watched.add(key);
      else watched.delete(key);
      return sendJson(response, 200, { watched: [...watched] });
    } catch (error) {
      const status = error.status ?? (error.code === "ERR_INVALID_URL" ? 400 : 500);
      return sendJson(response, status, { error: status < 500 ? error.message : "服务器处理失败" });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4310);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error("PORT 必须是 1024 至 65535 之间的整数。");
    process.exitCode = 1;
  } else {
    const server = createMemoryServer();
    server.on("error", (error) => {
      console.error(`启动失败：${error.code}；检查端口 ${port} 是否已被占用。`);
      process.exitCode = 1;
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`练习 03：http://127.0.0.1:${port}（Ctrl+C 停止）`);
    });
  }
}
