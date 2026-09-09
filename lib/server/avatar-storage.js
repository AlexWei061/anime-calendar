import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { getDataDirectory } from "../../db/sqlite.js";
import { avatarObjectKey } from "../avatar.js";
import { logOperationError } from "./http.js";

async function avatarPath(key, dataDirectory, create = false) {
  if (!/^avatars\/[0-9a-f]{64}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/.test(key)) {
    throw new TypeError("Invalid avatar key");
  }
  if (create) await mkdir(dataDirectory, { recursive: true, mode: 0o700 });
  const root = await realpath(dataDirectory);
  let directory = root;
  for (const segment of key.split("/").slice(0, -1)) {
    directory = join(directory, segment);
    if (create) await mkdir(directory, { mode: 0o700 }).catch((error) => { if (error.code !== "EEXIST") throw error; });
    const info = await lstat(directory);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("Invalid avatar directory: symbolic links are not allowed");
  }
  return join(root, key);
}

export async function readAvatar(key, dataDirectory = getDataDirectory()) {
  let file;
  try {
    file = await open(await avatarPath(key, dataDirectory), constants.O_RDONLY | constants.O_NOFOLLOW);
    return await file.readFile();
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  } finally {
    await file?.close();
  }
}

export async function deleteAvatarBestEffort(key, dataDirectory = getDataDirectory()) {
  try {
    await unlink(await avatarPath(key, dataDirectory));
  } catch (error) {
    if (error.code !== "ENOENT") logOperationError("delete-avatar-file", error);
  }
}

/** @param {(version: string) => string | null} commitVersion */
export async function replaceAvatar(email, bytes, commitVersion, dataDirectory = getDataDirectory()) {
  const version = randomUUID();
  const key = await avatarObjectKey(email, version);
  const path = await avatarPath(key, dataDirectory, true);
  let created = false;
  let previous;
  try {
    const file = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW, 0o600);
    created = true;
    try {
      await file.writeFile(bytes);
      await file.sync();
    } finally {
      await file.close();
    }
    const directory = await open(dirname(path), constants.O_RDONLY);
    try { await directory.sync(); } finally { await directory.close(); }
    previous = commitVersion(version);
  } catch (error) {
    if (created) await deleteAvatarBestEffort(key, dataDirectory);
    throw error;
  }
  if (previous) await deleteAvatarBestEffort(await avatarObjectKey(email, previous), dataDirectory);
  return version;
}
