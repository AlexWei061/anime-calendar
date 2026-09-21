# 独立域名部署

这套配置用于单台 Linux 服务器：Caddy 接收域名的 HTTPS 请求，转发给一个 Next.js 进程；SQLite 与私有头像保存在宿主机 `storage/`。按用户当前选择，服务器使用香港地域。境外服务器接入不要求办理中国大陆服务器的 ICP 备案，域名注册仍需遵守注册商要求；跨境访问体验应以自己的校园网和手机网络实测为准。[腾讯云地域与备案说明](https://cloud.tencent.com/document/api/243/19630)

## 1. 准备

- 一台香港 Linux 服务器，建议从 2 核、2 GB 内存起步；这是个人小站的起步配置，不是并发容量承诺。内存较小的服务器可在兼容架构的机器构建镜像后传入，避免现场构建占用内存。
- 已有域名或子域名，例如 `calendar.example.com`。将它的 DNS `A` 记录指向服务器公网 IPv4；只有服务器具备可用 IPv6 时才设置 `AAAA`。
- 安装 Docker Engine 与 Compose 插件，参考 [Docker 官方安装说明](https://docs.docker.com/engine/install/)。安全组和防火墙放行 TCP 80、443；HTTP/3 可额外放行 UDP 443。SSH 按自己的管理方式保留。
- 将本项目的完整源码、锁文件和本地封面图集放到服务器同一目录。构建不会下载番剧目录或远程封面。

## 2. 首次上线

在项目根目录执行：

```bash
cp .env.example .env
mkdir -p storage backups
sudo chown -R 1000:1000 storage backups
sudo chmod 700 storage backups
```

编辑 `.env`，把 `SITE_DOMAIN=calendar.example.com` 替换为你的域名，值只包含主机名，不含 `https://` 或路径。Compose 会据此设置应用的 HTTPS `APP_ORIGIN`。镜像以 UID 1000 运行，因此上面的目录权限步骤不可省略；宿主机挂载会覆盖镜像中预建目录的权限。

```bash
docker compose config --quiet
docker compose build app
```

### 首次部署时带上 Mac 上已有的账号

如果本地已有账号，先完成本节，再启动服务器应用。Git 已忽略数据库和头像，只上传源码不会带上账号。本节仅用于尚未启动过应用、`storage/` 为空的新服务器；已有数据的服务器使用第 5 节恢复流程。

先暂停在本地网页修改数据，在 Mac 的项目根目录创建一份当前数据的新备份：

```bash
DATA_DIR="$PWD/storage" npm run data:backup -- backups/from-mac-20260909
```

每次换一个尚不存在的备份目录名。使用当前 `storage/`，不要重新导入旧 `.wrangler`，也不要使用改密码之前的迁移备份，否则会把账号恢复到旧状态。

通过 SSH 的 SCP 或 SFTP 将整个 `backups/from-mac-20260909/` 上传到服务器项目的同名目录，包括数据库、头像和 `manifest.json`。如果 SSH 用户没有权限写入已经归 UID 1000 所有的 `backups/`，先上传到该 SSH 用户自己的目录，再用 `sudo mv` 移入项目的 `backups/`。随后在服务器项目目录执行：

```bash
(
set -eu
sudo chown -R 1000:1000 backups
sudo chmod 700 backups
docker compose run --rm --no-deps app node scripts/restore.mjs /app/backups/from-mac-20260909 /app/backups/ready-for-first-start
sudo rmdir storage
sudo mv backups/ready-for-first-start storage
sudo chown -R 1000:1000 storage
)
```

恢复会验证文件校验和并撤销旧会话；`rmdir` 只允许替换空目录，任何一步失败都会停止。账号、当前密码哈希、追番、已看和头像会保留。上传的备份也继续保留。

### 启动并检查

在服务器项目根目录执行：

```bash
docker compose up -d
docker compose ps
docker compose logs --tail=100 app caddy
```

DNS 生效且 80/443 可达后，Caddy 自动申请并续期证书。浏览器打开 `https://你的域名`，验证注册、追番、刷新后进度以及手机访问。`/api/health` 返回成功表示应用实际读取了数据库。

如果恢复了本地数据，用当前邮箱和密码重新登录，并核对追番、已看和头像。上线后数据库仍是 SQLite，但文件保存在云服务器的 `storage/`；服务器与 Mac 的数据库不会自动双向同步，后续日常使用以线上域名为准。

只有 Caddy 发布宿主机端口；不要另外向公网映射应用的 3000 端口。Caddy 覆盖客户端提供的 `X-Real-IP` 后再转发，因此 Compose 中启用 `TRUST_PROXY=1` 才能安全地按客户端地址限制认证尝试。变更代理结构时应同步检查这一边界。

## 3. 持久化与备份

`storage/anime-calendar.sqlite` 保存账号、会话、追番和逐集已看；`storage/avatars/` 保存私有头像。不要把这些文件放进 `public/`、Git 或镜像。账号邮箱是站内登录名，当前没有邮件验证或邮件找回密码服务。

在线备份使用 SQLite 快照，并复制快照实际引用的头像及 SHA-256 校验清单：

```bash
docker compose exec -T app node scripts/backup.mjs /app/backups/2026-09-08-before-upgrade
```

每次使用一个尚不存在的目录名。成功后把宿主机对应的 `backups/2026-09-08-before-upgrade/` 整个目录复制到另一台设备，并定期演练恢复。不要只复制运行中的 `.sqlite` 文件，因为 WAL 中可能还有已提交的数据。备份过程若遇到头像同时被更换／删除会失败并清理不完整产物，此时重新运行即可。

升级容器不会删除 bind mount 数据。Caddy 证书保存在 `caddy_data` 和 `caddy_config` 命名卷中，正常停机使用 `docker compose down` 即可。

## 4. 更新与回退

先备份，再用经过 `npm test` 和 lint 的源码构建镜像。建议每个版本设置不同的 `APP_IMAGE`，例如 `.env` 中的 `APP_IMAGE=anime-calendar:2026-09-08`，保留上一个镜像标签。

```bash
docker compose build app
docker compose up -d --no-deps app
docker compose ps
docker compose logs --tail=100 app
```

数据库迁移随代码存放在 `drizzle/`，启动时自动执行一次并校验迁移记录。不要修改已经执行过的迁移。回退代码前先检查数据库 schema 是否兼容；不兼容时，将备份恢复到新目录后切换存储，而不是直接用旧程序打开已升级的库。

## 5. 从备份恢复

恢复始终写入尚不存在的新目录，校验全部文件并撤销备份内的旧会话；账号密码、追番和观看进度保留。示例先停应用，在挂载的备份区内完成验证：

```bash
(
set -eu
test ! -e storage-before-restore-2026-09-08
test ! -L storage-before-restore-2026-09-08
docker compose stop app
docker compose run --rm --no-deps app node scripts/restore.mjs /app/backups/2026-09-08-before-upgrade /app/backups/restored-2026-09-08
sudo test -d backups/restored-2026-09-08
sudo mv storage storage-before-restore-2026-09-08
sudo mv backups/restored-2026-09-08 storage
sudo chown -R 1000:1000 storage
docker compose up -d --no-deps app
)
```

目录名每次更换，不覆盖已有旧库。确认登录与记录正确后，再按自己的保留策略处理旧目录。恢复完成后所有用户需要重新登录。

## 6. 从旧 D1 / R2 迁移

新旧站不是同一套存储，部署代码不会自动读取旧站数据。先通过旧站实际使用的平台导出 D1 SQL；如果账号上传过头像，同时导出 R2 对象，并保持 `avatars/<邮箱哈希>/<版本>.webp` 的对象目录结构。不要把凭据或导出文件提交到仓库。

在装有 Node.js 和项目依赖的机器上，将文件放到项目外，并运行：

```bash
npm run data:import-d1 -- /绝对路径/export.sql /绝对路径/new-storage /绝对路径/r2-objects
```

没有任何已上传头像时可省略最后一个参数。导入器只接受已知业务表的建表与插入语句，在内存中读取源 SQL，重新创建本地迁移记录，保留现有 PBKDF2 密码哈希与稳定番剧 ID；未知 SQL、孤立记录、缺失头像或已存在目标目录都会使导入停止。导入文件最大 64 MiB。旧会话不会迁入，旧版合法连播已看记录会在用户读取时按现有规则展开成单集。

先在临时实例检查账号、追番、观看进度和头像。正式切换时暂停旧站写入，取得最终导出，再导入一个新的目标目录；停止新站应用后将完整新目录作为 `storage/` 放到服务器，赋予 UID 1000 权限并启动。保留旧站与导出文件，直至完成核对。不要同时让新旧站继续接受相互独立的个人数据写入。

## 7. 不使用 Docker

推荐 Node.js 24 LTS。在目标系统上安装依赖并构建，原生 SQLite 模块不能跨操作系统复制：

```bash
npm ci
npm run build
```

构建脚本将服务、静态资源、迁移和维护命令一起放进 `.next/standalone/`。设置 `NODE_ENV=production`、`APP_ORIGIN=https://你的域名`、绝对路径的 `DATA_DIR`、`HOSTNAME=127.0.0.1` 与 `PORT=3000` 后，可由自己的进程管理器运行 `node .next/standalone/server.js`，再配置 HTTPS 反向代理。官方说明见 [Next.js 自托管](https://nextjs.org/docs/app/guides/self-hosting)。

维护命令从项目根目录运行 `DATA_DIR=/与服务相同的绝对路径 npm run data:backup -- <新备份目录>`、`npm run data:restore -- <备份目录> <新存储目录>`。备份需要显式指定与进程管理器一致的存储路径；恢复的目标目录由命令参数指定。生产环境不应启用 `ALLOW_INSECURE_LOCALHOST`；它只用于本机 HTTP 测试。

当前设计为单台服务器、单应用实例。不要将 SQLite 放在网络共享盘上，也不要扩为多个应用副本共用同一数据目录。目录更新仍由维护脚本主动执行，部署本身不会自动刷新季度数据。
