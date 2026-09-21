# 读懂你的番剧日历 · 项目学习室

为有 C++ / Python 基础、信息学竞赛经历的数学系本科生编写的独立中文教学网站。以当前 Next.js / Node.js / SQLite / Docker / Caddy 项目为教材，目标是能独立修改、验证、部署、备份恢复和定位常见故障。

## 打开

直接在浏览器打开 `teach/index.html`。全部正文、源码快照、搜索、小测和互动实验可离线运行；官方延伸阅读需要联网。

也可以在项目根目录启动本机预览：

```bash
python3 -m http.server 8766 --bind 127.0.0.1 --directory teach
```

访问 [项目学习室](http://127.0.0.1:8766/)。这个地址只在预览服务运行期间可用，Control-C 停止。学习网站本身不需要 npm 安装，实际项目练习需要符合仓库要求的 Node 与依赖。

## 学习路线

| 阶段 | 课程 | 完成后能够 |
| --- | --- | --- |
| 建立模型 | 1 网站协作；2 Node/npm；3 JS/TS；4 异步；5 HTML/CSS | 隔离运行项目，区分执行环境，观察请求与界面 |
| 理解项目 | 6 React；7 排期；8 认证与保存；9 数据与数据库 | 从用户动作追到源码和持久化记录 |
| 完成变更 | 10 调试；11 Git 与维护流程 | 复现、最小修改、测试和审阅准确差异 |
| 持续维护 | 12 部署；13 备份恢复；14 排障；15 综合验收 | 解释部署配置，恢复数据，凭证据诊断故障 |

目前第 2 课 **Node 与 HTTP** 已扩为深入样板，其余 14 课仍是项目导读与维护手册，尚未达到同等教学深度。不能把阅读完现有全站等同于已经具备独立运营能力。第 1 课先建立模型，其实践在完成第 2 课隔离启动后进行。

样板包含 21 节，建议约 5–8 小时分三次完成：查询接口 → 正文、写入与数据寿命 → 独立作业及真实项目映射。支持章节目录和 `#node/节号` 直接跳转（节号从 0 起），章内切换保留已展开答案与互动状态。访问 [深入样板](http://127.0.0.1:8766/#node)。学习安排是估计，以自己的实验结果为准。

每课包含原理、真实源码入口、操作步骤、小测及验收；网页里的“完成”是自我记录，不是能力认证。最后一课区分本地维护达标和真实部署达标，不会把模拟正确等同于已经能维护生产服务。

## 互动与练习

网站包含搜索标准化、React 状态队列、凌晨放送日、区间分栏、请求生命周期、故障诊断和三个修复实验。模拟中不会发出真实账号请求或执行服务器命令。源码查看器提供白名单文件的全文、行号和 SHA-256；搜索覆盖课程正文。支持桌面/手机阅读、专注模式和整本打印。

**Node / HTTP 深入样板**：按网页讲解手写 Hello 服务，再逐步运行 `exercises/node-http/` 中的 01–03。独立增加 remaining 查询，并在 `04-student.mjs` 完成统计接口。示例、学生作业和参考答案分开验证：

```bash
node --test teach/exercises/node-http/examples.test.mjs
node --test teach/exercises/node-http/assessment.test.mjs
NODE_HTTP_SOLUTION=1 node --test teach/exercises/node-http/assessment.test.mjs
```

未完成的学生版默认返回 501，验收失败是刻意设置的；只有不带 `NODE_HTTP_SOLUTION` 的验收通过才说明自己的作业达标。测试会临时监听回环端口、发送真实 HTTP 请求并关闭服务，不读写账号数据库。完整说明见 `exercises/node-http/README.md`。

**三个可编辑故障副本**：只改 `teach/exercises/repair.mjs`。

```bash
node --test teach/exercises/repair.test.mjs
```

初始 3 通过、3 失败是刻意设计；修复后应为 6/6。参考答案单独验证：

```bash
TEACH_SOLUTION=1 node --test teach/exercises/repair.test.mjs
```

这个命令只证明参考答案正确，不会修改或代替你完成故障副本。

**真实迁移的内存 SQLite 练习**：

```bash
python3 teach/exercises/schema.py
```

只读项目 SQL 并在内存中执行，不访问日常数据库。

**真实备份恢复演练**：

```bash
node teach/exercises/operations.mjs
```

在系统临时目录创建练习数据，调用项目的真实备份/恢复实现，核对快照、账号记录、头像、会话撤销、拒绝覆盖和失败清理，结束后删除该次创建的练习目录。不会读写日常 `storage/`。

## 目录与更新

| 文件 | 用途 |
| --- | --- |
| `index.html`、`styles.css`、`app.js` | 导航、阅读、进度、源码弹窗、打印 |
| `course.js` | 8 个项目核心课程、实验室和速查手册 |
| `foundations.js` | Node、异步与浏览器 3 课，组装先修顺序 |
| `node-http.js` | 将第 2 课扩为 21 节深入样板，保留原课程 ID |
| `operations.js` | 部署、备份、排障和综合验收 4 课 |
| `labs.js` | 隔离的交互模型与逐项反馈 |
| `snapshot.py`、`snapshot.js` | 明确白名单的源码快照生成器与产物 |
| `exercises/` | 编辑练习、参考答案、内存 SQL、备份恢复 |
| `tests/site.test.mjs` | 内容引用、快照、路由、交互模型回归 |

学习进度保存在浏览器 localStorage `ac-teach-progress-v3`；与真实应用账号及主题独立。旧课程的 v2 记录保留但不自动计入新课完成情况。不同浏览器、file 与 HTTP 地址各自保存进度；存储不可用时仍能学习。

更新源码后运行：

```bash
python3 teach/snapshot.py
node --test teach/tests/site.test.mjs
```

快照读取当前工作区，可能包含尚未提交的源码改动；它不证明线上版本。更新快照后仍须核对讲解、片段行号、命令和交互模型。脚本只读列明的代码与公开配置示例，不读取 `.env`、数据库、头像或凭据。

本次验证记录见 `teach/VERIFICATION.md`。实际业务部署仍以仓库的 `docs/deployment.md` 为操作依据；教材的操作模板需要替换为你核对过的目录、域名和镜像标签。
