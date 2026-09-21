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

export function createRoutesServer() {
  return createServer((request, response) => {
    let url;
    try {
      url = new URL(request.url, "http://127.0.0.1");
    } catch {
      return sendJson(response, 400, { error: "请求地址无效" });
    }
    if (url.pathname !== "/health" && url.pathname !== "/api/anime") {
      return sendJson(response, 404, { error: "找不到这个接口" });
    }
    if (request.method !== "GET") {
      return sendJson(response, 405, { error: "这个接口只接受 GET" }, { Allow: "GET" });
    }
    if (url.pathname === "/health") {
      return sendJson(response, 200, { ok: true });
    }
    const title = (url.searchParams.get("title") ?? "").trim();
    return sendJson(response, 200, { anime: anime.filter((item) => item.title.includes(title)) });
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4310);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error("PORT 必须是 1024 至 65535 之间的整数。");
    process.exitCode = 1;
  } else {
    const server = createRoutesServer();
    server.on("error", (error) => {
      console.error(`启动失败：${error.code}；检查端口 ${port} 是否已被占用。`);
      process.exitCode = 1;
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`练习 02：http://127.0.0.1:${port}（Ctrl+C 停止）`);
    });
  }
}
