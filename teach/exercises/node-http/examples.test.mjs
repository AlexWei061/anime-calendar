import test from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { once } from "node:events";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHelloServer } from "./01-hello.mjs";
import { createRoutesServer } from "./02-routes.mjs";
import { createMemoryServer } from "./03-memory.mjs";

async function withServer(create, run) {
  const server = create();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await run(base);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

function chunkedPut(base, chunks, headers = { "Content-Type": "application/json" }) {
  return new Promise((resolve, reject) => {
    const outgoing = request(`${base}/api/watched`, { method: "PUT", headers }, (response) => {
      const received = [];
      response.on("data", (chunk) => received.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(received)) }));
      response.on("error", reject);
    });
    outgoing.on("error", reject);
    for (const chunk of chunks) outgoing.write(chunk);
    outgoing.end();
  });
}

async function put(base, body, headers = { "Content-Type": "application/json" }) {
  return fetch(`${base}/api/watched`, { method: "PUT", headers, body: JSON.stringify(body) });
}

test("01：任意 GET 路径返回 UTF-8 文本，尚未加入路由判断", async () => {
  await withServer(createHelloServer, async (base) => {
    for (const path of ["/", "/health", "/does-not-exist?title=abc"]) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/plain; charset=utf-8");
      assert.equal(await response.text(), "Hello, 番剧日历！\n");
    }
  });
});

for (const [name, create] of [["02", createRoutesServer], ["03", createMemoryServer]]) {
  test(`${name}：路径、查询参数、JSON、404 与 405`, async () => {
    await withServer(create, async (base) => {
      const health = await fetch(`${base}/health?check=1`);
      assert.equal(health.status, 200);
      assert.equal(health.headers.get("content-type"), "application/json; charset=utf-8");
      assert.deepEqual(await health.json(), { ok: true });
      const all = await fetch(`${base}/api/anime`);
      assert.equal((await all.json()).anime.length, 3);
      const selected = await fetch(`${base}/api/anime?title=${encodeURIComponent(" 放映室 ")}`);
      assert.deepEqual((await selected.json()).anime.map((item) => item.id), ["aurora", "orbit"]);
      const empty = await fetch(`${base}/api/anime?title=不存在`);
      assert.deepEqual(await empty.json(), { anime: [] });
      assert.equal((await fetch(`${base}/api/animes`)).status, 404);
      assert.equal((await fetch(`${base}/api/anime/`)).status, 404);
      for (const path of ["/health", "/api/anime"]) {
        const wrongMethod = await fetch(base + path, { method: "POST" });
        assert.equal(wrongMethod.status, 405);
        assert.equal(wrongMethod.headers.get("allow"), "GET");
      }
    });
  });
}

test("03：成功更新、重复 PUT 幂等、取消已看", async () => {
  await withServer(createMemoryServer, async (base) => {
    assert.deepEqual(await (await fetch(`${base}/api/watched`)).json(), { watched: [] });
    const value = { animeId: "aurora", episode: 1, watched: true };
    for (let index = 0; index < 2; index += 1) {
      const response = await put(base, value);
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { watched: ["aurora:1"] });
    }
    await put(base, { animeId: "orbit", episode: 6, watched: true });
    const removed = await put(base, { ...value, watched: false });
    assert.deepEqual(await removed.json(), { watched: ["orbit:6"] });
    assert.deepEqual(await (await fetch(`${base}/api/watched?view=all`)).json(), { watched: ["orbit:6"] });
    const method = await fetch(`${base}/api/watched`, { method: "POST" });
    assert.equal(method.status, 405);
    assert.equal(method.headers.get("allow"), "GET, PUT");
  });
});

test("03：所有输入校验都发生在修改 Set 之前", async () => {
  await withServer(createMemoryServer, async (base) => {
    const valid = { animeId: "aurora", episode: 1, watched: true };
    await put(base, valid);
    const invalid = [null, [], 1, "aurora", {},
      { ...valid, animeId: "unknown" }, { ...valid, animeId: 1 },
      { ...valid, episode: "1" }, { ...valid, episode: 0 },
      { ...valid, episode: -1 }, { ...valid, episode: 1.5 },
      { ...valid, episode: 13 }, { ...valid, episode: null },
      { ...valid, watched: "true" }, { ...valid, watched: 1 },
    ];
    for (const value of invalid) assert.equal((await put(base, value)).status, 400);
    const malformed = await chunkedPut(base, ["{\"animeId\":"]);
    assert.equal(malformed.status, 400);
    assert.match(malformed.body.error, /JSON/);
    assert.equal((await chunkedPut(base, [])).status, 400);
    assert.equal((await put(base, valid, { "Content-Type": "text/plain" })).status, 415);
    assert.equal((await chunkedPut(base, [JSON.stringify(valid)], {})).status, 415);
    assert.deepEqual(await (await fetch(`${base}/api/watched`)).json(), { watched: ["aurora:1"] });
  });
});

test("03：跨片段拼接 JSON 与中文 UTF-8，按 bytes 限制正文", async () => {
  await withServer(createMemoryServer, async (base) => {
    const source = Buffer.from(JSON.stringify({ animeId: "comet", episode: 3, watched: true, note: "中文" }));
    const chineseByte = source.indexOf(Buffer.from("中"));
    const split = await chunkedPut(base, [source.subarray(0, chineseByte + 1), source.subarray(chineseByte + 1)], {
      "Content-Type": "application/json; charset=utf-8",
    });
    assert.equal(split.status, 200);
    assert.deepEqual(split.body, { watched: ["comet:3"] });
    const plain = JSON.stringify({ animeId: "aurora", episode: 12, watched: true });
    const atLimit = plain + " ".repeat(4096 - Buffer.byteLength(plain));
    assert.equal((await chunkedPut(base, [atLimit.slice(0, 2000), atLimit.slice(2000)])).status, 200);
    assert.equal((await chunkedPut(base, [atLimit, " "])).status, 413);
    const tooLarge = JSON.stringify({ animeId: "orbit", episode: 1, watched: true, note: "中".repeat(1400) });
    assert.ok(tooLarge.length < 4096);
    assert.ok(Buffer.byteLength(tooLarge) > 4096);
    assert.equal((await chunkedPut(base, [tooLarge.slice(0, 1000), tooLarge.slice(1000)])).status, 413);
    assert.deepEqual(await (await fetch(`${base}/api/watched`)).json(), { watched: ["comet:3", "aurora:12"] });
  });
});

test("03：两个服务实例不共享 Set，停止后无 HTTP，重建实例会丢失内存记录", async () => {
  let stoppedBase;
  await withServer(createMemoryServer, async (first) => {
    stoppedBase = first;
    await put(first, { animeId: "aurora", episode: 1, watched: true });
    await withServer(createMemoryServer, async (second) => {
      assert.deepEqual(await (await fetch(`${second}/api/watched`)).json(), { watched: [] });
    });
    assert.deepEqual(await (await fetch(`${first}/api/watched`)).json(), { watched: ["aurora:1"] });
  });
  await assert.rejects(fetch(`${stoppedBase}/health`, { signal: AbortSignal.timeout(2000) }));
  await withServer(createMemoryServer, async (restarted) => {
    assert.deepEqual(await (await fetch(`${restarted}/api/watched`)).json(), { watched: [] });
  });
});

test("所有阶段被 import 时不会自动启动；CLI 拒绝错误端口", () => {
  for (const name of ["01-hello", "02-routes", "03-memory", "04-student", "05-solution"]) {
    const moduleUrl = new URL(`./${name}.mjs`, import.meta.url);
    const imported = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${JSON.stringify(moduleUrl.href)})`], {
      timeout: 3000, encoding: "utf8", env: { ...process.env, PORT: "0" },
    });
    assert.equal(imported.status, 0, imported.stderr);
    assert.equal(imported.stdout, "");
    for (const port of ["0", "1023", "65536", "4310.5", "wrong", ""]) {
      const invalid = spawnSync(process.execPath, [fileURLToPath(moduleUrl)], {
        timeout: 3000, encoding: "utf8", env: { ...process.env, PORT: port },
      });
      assert.equal(invalid.status, 1, invalid.stderr);
      assert.match(invalid.stderr, /1024.*65535/);
    }
  }
});

test("所有阶段 CLI 端口占用时明确报错并以非零退出", async () => {
  await withServer(createHelloServer, async (base) => {
    const port = new URL(base).port;
    for (const name of ["01-hello", "02-routes", "03-memory", "04-student", "05-solution"]) {
      const collision = spawnSync(process.execPath, [fileURLToPath(new URL(`./${name}.mjs`, import.meta.url))], {
        timeout: 3000, encoding: "utf8", env: { ...process.env, PORT: port },
      });
      assert.equal(collision.status, 1, collision.stderr);
      assert.match(collision.stderr, /EADDRINUSE/);
      assert.match(collision.stderr, /启动失败/);
    }
  });
});

test("CLI 支持显式 PORT 覆盖并固定监听回环地址", async () => {
  let port;
  await withServer(createHelloServer, (base) => { port = new URL(base).port; });
  const child = spawn(process.execPath, [fileURLToPath(new URL("./03-memory.mjs", import.meta.url))], {
    env: { ...process.env, PORT: port }, stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    const output = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("CLI 未及时监听")), 3000);
      child.once("error", (error) => { clearTimeout(timeout); reject(error); });
      child.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`CLI 提前退出 ${code}`)); });
      child.stdout.once("data", (data) => { clearTimeout(timeout); resolve(String(data)); });
    });
    assert.match(output, new RegExp(`127\\.0\\.0\\.1:${port}`));
    assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/health`)).json(), { ok: true });
  } finally {
    child.kill();
    if (child.exitCode === null && child.signalCode === null) await once(child, "exit");
  }
});
