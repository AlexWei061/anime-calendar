import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";

const { createMemoryServer } = await import(
  process.env.NODE_HTTP_SOLUTION === "1" ? "./05-solution.mjs" : "./04-student.mjs"
);

async function withServer(run) {
  const server = createMemoryServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}

async function mark(base, animeId, episode, watched = true) {
  const response = await fetch(`${base}/api/watched`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ animeId, episode, watched }),
  });
  assert.equal(response.status, 200);
}

async function summary(base, expected, query = "") {
  const response = await fetch(`${base}/api/summary${query}`);
  assert.equal(response.status, 200, "GET /api/summary 应返回 200；先完成 04-student.mjs 的 TODO");
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");
  assert.deepEqual(await response.json(), expected);
}

test("新增接口：空状态返回两个 0，查询参数不影响路径匹配", async () => {
  await withServer(async (base) => {
    await summary(base, { watchedAnimeCount: 0, watchedEpisodeCount: 0 });
    await summary(base, { watchedAnimeCount: 0, watchedEpisodeCount: 0 }, "?check=1");
  });
});

test("同一部番剧看两集：部数为 1，单集数为 2；重复读取不修改状态", async () => {
  await withServer(async (base) => {
    await mark(base, "aurora", 1);
    await mark(base, "aurora", 2);
    await summary(base, { watchedAnimeCount: 1, watchedEpisodeCount: 2 });
    await summary(base, { watchedAnimeCount: 1, watchedEpisodeCount: 2 });
    assert.deepEqual(await (await fetch(`${base}/api/watched`)).json(), { watched: ["aurora:1", "aurora:2"] });
  });
});

test("不同番剧合并计数；重复 PUT 不重复计数", async () => {
  await withServer(async (base) => {
    await mark(base, "aurora", 1);
    await mark(base, "aurora", 1);
    await mark(base, "orbit", 6);
    await summary(base, { watchedAnimeCount: 2, watchedEpisodeCount: 2 });
  });
});

test("取消一集仍保留该番剧；取消末集后部数减一", async () => {
  await withServer(async (base) => {
    await mark(base, "aurora", 1);
    await mark(base, "aurora", 2);
    await mark(base, "aurora", 1, false);
    await summary(base, { watchedAnimeCount: 1, watchedEpisodeCount: 1 });
    await mark(base, "aurora", 2, false);
    await mark(base, "aurora", 2, false);
    await summary(base, { watchedAnimeCount: 0, watchedEpisodeCount: 0 });
  });
});

test("新路由只接受 GET，拒绝时保留 Allow 与原有状态", async () => {
  await withServer(async (base) => {
    await mark(base, "comet", 3);
    for (const method of ["POST", "PUT", "DELETE"]) {
      const response = await fetch(`${base}/api/summary?check=1`, { method });
      assert.equal(response.status, 405);
      assert.equal(response.headers.get("allow"), "GET");
    }
    await summary(base, { watchedAnimeCount: 1, watchedEpisodeCount: 1 });
    assert.equal((await fetch(`${base}/api/summaries`)).status, 404);
  });
});

test("无效更新不计入 summary，原目录和 health 仍能读取", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/watched`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeId: "comet", episode: 4, watched: true }),
    });
    assert.equal(response.status, 400);
    await summary(base, { watchedAnimeCount: 0, watchedEpisodeCount: 0 });
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
    assert.equal((await (await fetch(`${base}/api/anime?title=放映室`)).json()).anime.length, 2);
  });
});
