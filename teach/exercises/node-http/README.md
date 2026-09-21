# Node 与 HTTP 逐步练习

在番剧日历仓库根目录运行。需要 Node.js >= 22.13.0，无额外依赖。
这些程序只监听本机 `127.0.0.1`，使用 3 条合成番剧数据，没有登录、文件写入或数据库。
内存里的已看记录会在进程停止后消失，不连接主项目的账号或个人记录。

每次只启动一个阶段；切换前在服务终端按 `Ctrl+C`。

```bash
node teach/exercises/node-http/01-hello.mjs
node teach/exercises/node-http/02-routes.mjs
node teach/exercises/node-http/03-memory.mjs
```

默认地址是 `http://127.0.0.1:4310`。需要换端口时显式指定：

```bash
PORT=4311 node teach/exercises/node-http/03-memory.mjs
```

CLI 端口必须是 1024 至 65535 之间的整数。端口占用时程序报错退出。
`01` 对每个合法请求都返回 Hello；`02` 开始识别路径、查询参数和方法；`03` 加入正文读取、校验和内存状态。
`03` 按字节累计正文长度，最多保存 4096 bytes，超限后继续读完请求再返回 413。
这是用于理解流式正文的本机实验，不是完整的生产上传防护。

另开终端向 `03` 发送真实请求：

```bash
curl -i http://127.0.0.1:4310/health
curl -i --get --data-urlencode 'title=放映室' http://127.0.0.1:4310/api/anime
curl -i -X PUT http://127.0.0.1:4310/api/watched \
  -H 'Content-Type: application/json' \
  --data '{"animeId":"aurora","episode":1,"watched":true}'
curl -i http://127.0.0.1:4310/api/watched
```

目录 ID 为 `aurora`（12 集）、`orbit`（6 集）、`comet`（3 集）。
`GET /api/anime` 返回 `{anime:[...]}`，已看读写均返回 `{watched:["aurora:1"]}` 这种结构。

验证已完成的示例：

```bash
node --test teach/exercises/node-http/examples.test.mjs
```

独立练习：编辑 `04-student.mjs` 的 TODO，实现 `GET /api/summary`。
返回 `{watchedAnimeCount,watchedEpisodeCount}`；至少一集已看计一部，不同单集各计一次。
已有路由和校验需要保持正常。`04` 是 `03` 的有意复制，以便在同一文件里独立完成迁移。

```bash
node teach/exercises/node-http/04-student.mjs
node --test teach/exercises/node-http/assessment.test.mjs
```

`assessment.test.mjs` 默认测试学生文件，尚未完成 TODO 时预期失败。
测试自行分配回环端口并停止服务，不需要提前启动练习程序。
完成后再查看 `05-solution.mjs`，可单独验证参考答案：

```bash
NODE_HTTP_SOLUTION=1 node --test teach/exercises/node-http/assessment.test.mjs
```

两个测试入口应分开运行，避免把尚未完成的学习任务当成项目回归失败。
