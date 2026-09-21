import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

export function createHelloServer() {
  return createServer((request, response) => {
    response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Hello, 番剧日历！\n");
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 4310);
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    console.error("PORT 必须是 1024 至 65535 之间的整数。");
    process.exitCode = 1;
  } else {
    const server = createHelloServer();
    server.on("error", (error) => {
      console.error(`启动失败：${error.code}；检查端口 ${port} 是否已被占用。`);
      process.exitCode = 1;
    });
    server.listen(port, "127.0.0.1", () => {
      console.log(`练习 01：http://127.0.0.1:${port}（Ctrl+C 停止）`);
    });
  }
}
