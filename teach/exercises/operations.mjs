import assert from "node:assert/strict";
import { access, mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openDatabase } from "../../db/sqlite.js";
import { avatarObjectKey } from "../../lib/avatar.js";
import { hashPassword, hashSessionToken } from "../../lib/auth.js";
import { createBackup, restoreBackup } from "../../scripts/storage.mjs";

const projectDirectory = fileURLToPath(new URL("../../", import.meta.url));
const initialDirectory = process.cwd();
const root = await mkdtemp(join(tmpdir(), "anime-operations-lesson-"));
const liveDirectory = join(root, "live");
const backupDirectory = join(root, "snapshot");
const restoredDirectory = join(root, "restored");
const email = "learner@example.test";
const version = "11111111-1111-4111-8111-111111111111";
const avatarBytes = Buffer.from("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA", "base64");
let live;
let restored;

try {
  process.chdir(projectDirectory);
  console.log("练习只使用临时目录：", root);
  live = openDatabase(join(liveDirectory, "anime-calendar.sqlite"));
  live.pragma("wal_autocheckpoint = 0");
  const passwordHash = await hashPassword("Only-for-this-isolated-lesson");
  const tokenHash = await hashSessionToken("temporary-session-for-this-lesson");
  live.transaction(() => {
    live.prepare("INSERT INTO users(email,password_hash,display_name,created_at,avatar_version) VALUES(?,?,?,?,?)")
      .run(email, passwordHash, "隔离练习用户", Date.now(), version);
    live.prepare("INSERT INTO auth_sessions(token_hash,user_email,expires_at) VALUES(?,?,?)")
      .run(tokenHash, email, Date.now() + 60_000);
    live.prepare("INSERT INTO anime_selections(user_email,anime_id) VALUES(?,?)")
      .run(email, "lesson-anime");
    live.prepare("INSERT INTO anime_episode_views(user_email,anime_id,episode_start,episode) VALUES(?,?,?,?)")
      .run(email, "lesson-anime", 1, 1);
  })();
  const avatarKey = await avatarObjectKey(email, version);
  await mkdir(dirname(join(liveDirectory, avatarKey)), { recursive: true });
  await writeFile(join(liveDirectory, avatarKey), avatarBytes, { mode: 0o600 });
  assert.ok((await stat(join(liveDirectory, "anime-calendar.sqlite-wal"))).size > 0);
  console.log("1/6 PASS：启用 WAL、保持连接打开，并写入账号、会话、追番、单集和头像。");

  await createBackup(liveDirectory, backupDirectory);
  const manifest = JSON.parse(await readFile(join(backupDirectory, "manifest.json"), "utf8"));
  assert.equal(manifest.version, 1);
  assert.equal(manifest.files.length, 2);
  assert.ok(manifest.files.every(({ sha256 }) => /^[0-9a-f]{64}$/.test(sha256)));
  console.log("2/6 PASS：真实 backup API 生成快照，清单包含数据库与当前头像的 SHA-256。");

  live.prepare("INSERT INTO anime_episode_views(user_email,anime_id,episode_start,episode) VALUES(?,?,?,?)")
    .run(email, "lesson-anime", 2, 2);
  await restoreBackup(backupDirectory, restoredDirectory);
  restored = new Database(join(restoredDirectory, "anime-calendar.sqlite"), { readonly: true, fileMustExist: true });
  assert.equal(restored.pragma("integrity_check", { simple: true }), "ok");
  assert.equal(restored.prepare("SELECT password_hash FROM users WHERE email=?").get(email).password_hash, passwordHash);
  assert.deepEqual(restored.prepare("SELECT anime_id FROM anime_selections WHERE user_email=?").all(email),
    [{ anime_id: "lesson-anime" }]);
  assert.deepEqual(restored.prepare("SELECT episode_start,episode FROM anime_episode_views WHERE user_email=?").all(email),
    [{ episode_start: 1, episode: 1 }]);
  assert.deepEqual(await readFile(join(restoredDirectory, avatarKey)), avatarBytes);
  assert.equal(restored.prepare("SELECT count(*) AS n FROM auth_sessions").get().n, 0);
  assert.equal(live.prepare("SELECT count(*) AS n FROM auth_sessions").get().n, 1);
  assert.equal(live.prepare("SELECT count(*) AS n FROM anime_episode_views").get().n, 2);
  console.log("3/6 PASS：恢复保留快照时的密码哈希、追番、单集、头像；新增的第 2 集不在旧快照里。");
  console.log("4/6 PASS：恢复目录的会话已撤销，原库会话与后续写入保持原状。");

  await assert.rejects(restoreBackup(backupDirectory, restoredDirectory), /exist/i);
  assert.equal(restored.prepare("SELECT count(*) AS n FROM users").get().n, 1);
  console.log("5/6 PASS：恢复拒绝覆盖已有目录，并保留其内容。");

  await writeFile(join(backupDirectory, avatarKey), "故意损坏的练习头像");
  const failedDirectory = join(root, "failed-restore");
  await assert.rejects(restoreBackup(backupDirectory, failedDirectory), /checksum/i);
  await assert.rejects(access(failedDirectory), (error) => error.code === "ENOENT");
  console.log("6/6 PASS：校验和检测到损坏；失败时清除本次创建的不完整恢复目录。");
  console.log("练习结论：已验证本机隔离的备份/恢复路径；未连接服务器，也未验证线上服务。");
} finally {
  restored?.close();
  live?.close();
  process.chdir(initialDirectory);
  await rm(root, { recursive: true, force: true });
  console.log("CLEANUP：本练习创建的临时目录已清除，真实 storage 未被读写。");
}
