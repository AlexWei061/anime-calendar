(() => {
  const link = (path, start = 1, end = start, label = path) => '<button class="source-link" data-source="' + path + '" data-start="' + start + '" data-end="' + end + '">' + label + '</button>';
  const pre = (code) => '<pre><code>' + code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</code></pre>';
  const table = (heads, rows) => '<div class="table-wrap"><table><thead><tr>' + heads.map(h => '<th>' + h + '</th>').join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
  const note = (title, body) => '<div class="callout amber"><strong>' + title + '</strong><p>' + body + '</p></div>';

  window.TEACH.lessons.push(
    {
      id: 'deployment',
      nav: '上线：让程序长期提供服务',
      title: '从一台电脑上的网页，到域名后的服务',
      subtitle: 'Linux、网络入口、Docker 与当前部署文件',
      time: '90–120 分钟',
      tags: ['Linux / SSH', 'DNS / TLS', 'Docker / Caddy'],
      lead: '部署是让一份明确版本的程序，在另一台机器上持续接收请求，并把用户数据保存到可管理的位置。你已有程序执行的基础；本课补上“程序一直运行、网络能找到它、重启不丢数据”这三个条件。',
      sections: [
        {
          title: '1. 先认清：你控制的是哪台机器、哪个进程',
          html: '<p>终端是向操作系统发命令的界面，shell 负责解释命令。<code>node server.js</code> 启动一个进程：它有 PID、自己的内存、工作目录和环境变量。进程退出后，内存中的变量消失；写到持久化磁盘的数据才可能保留。网站进程通常等待 HTTP 请求，不会像竞赛程序读完 stdin 后立刻退出。</p><p><code>ssh 用户名@服务器地址</code> 是在远程机器上打开一段加密的终端会话。SSH 私钥留在自己电脑，公钥可放到服务器；首次连接时核对云控制台给出的主机指纹。输入 <code>pwd</code> 和 <code>hostname</code>，确认路径与机器，再执行任何修改命令。<code>exit</code> 退出远程 shell；关闭 SSH 不应该让正式网站消失，所以本项目交给 Docker 的重启策略运行。</p>' +
            pre('# 在你当前的终端观察，不修改文件\npwd\nhostname\nwhoami\nid\n\n# 连接模板：把用户名与地址换成你自己的配置\nssh DEPLOY_USER@SERVER_ADDRESS') +
            '<p>命令中的 <code>DEPLOY_USER</code>、<code>SERVER_ADDRESS</code> 是占位符，不能原样使用。<code>sudo</code> 临时以更高权限执行一条命令；权限越高越需要先确认目录。不要为了网站部署随意关闭 SSH 登录通道或全局修改防火墙，先保留一条已验证的管理连接。</p>' +
            table(['位置', '包含什么', '如何确认'], [
              ['自己的 Mac', '编辑器、源码、个人开发数据库', 'hostname、pwd、node --version'],
              ['远程 Linux 宿主机', 'Docker、项目目录、storage、backups', 'SSH 后的 hostname 与 docker compose ps'],
              ['app 容器', 'Node 运行时、构建产物、挂载进来的数据', 'docker compose exec app id'],
              ['用户的浏览器', '页面、脚本、Cookie 与临时状态', '开发者工具 Network / Application']
            ])
        },
        {
          title: '2. 域名怎样找到监听端口的进程',
          html: '<p>IP 地址找到一台网络主机，端口找到这台主机上的一个服务入口。<code>127.0.0.1</code> 只表示“当前这台机器自己”；在手机里访问它不会访问你的 Mac。<code>0.0.0.0</code> 常用于监听全部 IPv4 网卡，不是给用户打开的目标地址。</p><p>DNS 把域名解析成地址：<code>A</code> 记录给 IPv4，<code>AAAA</code> 给 IPv6。域名解析正确，不代表端口已开放。云安全组、操作系统防火墙、进程监听是三层不同条件。DNS 记录有缓存，修改后不同网络看到新地址的时间可能不同；设置 AAAA 前确认 IPv6 整条路径可用，避免部分用户优先走到坏的 IPv6。</p><div class="flow"><div class="flow-node">浏览器<small>https://你的域名</small></div><span class="flow-arrow">→</span><div class="flow-node">DNS + 公网 443<small>找到服务器</small></div><span class="flow-arrow">→</span><div class="flow-node">Caddy<small>TLS、反向代理</small></div><span class="flow-arrow">→</span><div class="flow-node">app:3000<small>Next.js → SQLite</small></div></div><p>TLS 给这段连接提供加密和服务器身份校验；证书让浏览器确认它连接的是指定域名。它不会自动修复弱密码、错误授权或数据库泄露。本项目让 Caddy 接收 HTTPS、向内部 app 转发 HTTP，这叫反向代理。Caddy 的自动 HTTPS 负责申请与续期证书，前提是域名和验证所需的网络条件可用。<a href="https://caddyserver.com/docs/automatic-https" target="_blank" rel="noreferrer">Caddy 官方：自动 HTTPS</a>。</p><p>读 ' +
            link('Caddyfile', 1, 10) + '：压缩减少传输体积；请求体上限挡住过大输入；<code>reverse_proxy app:3000</code> 使用 Compose 内部服务名。只公开 Caddy 的 80/443；app 的 3000 留在容器网络里。UDP 443 用于 HTTP/3，基础 HTTPS 仍需要 TCP 443。</p>'
        },
        {
          title: '3. 镜像、容器、挂载：三个东西不能混为一谈',
          html: '<p>镜像是一份可分发的运行文件包；容器是根据镜像启动的隔离进程。更新源码不会自动改变已有镜像，构建新镜像也不会自动替换正在运行的容器。把它类比成“可执行文件”和“运行实例”很有帮助，但镜像还包含运行时及所需文件。<a href="https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/" target="_blank" rel="noreferrer">Docker 官方：镜像</a>。</p>' +
            table(['本仓库文件/概念', '实际职责', '你要理解的后果'], [
              [link('Dockerfile', 1, 19), '构建阶段安装依赖并 build；运行阶段复制 standalone，用非 root 的 node 用户启动。', '多阶段构建把编译工具与运行文件分开。'],
              [link('compose.yaml', 1, 50), '声明 app、caddy、网络端口、挂载、环境变量与重启策略。', 'docker compose up 根据配置启动服务，不替你核对业务记录。'],
              ['bind mount：./storage:/app/storage', '左侧是宿主机目录，右侧是容器内看到的位置。', '替换容器后宿主机数据仍在；宿主机磁盘故障仍可能丢失它。'],
              ['named volume：caddy_data / caddy_config', '由 Docker 管理的持久化卷，保存 Caddy 状态。', '普通 down 与删除卷不同；不要随意加 -v。'],
              ['APP_IMAGE', 'Compose 使用的应用镜像名称/标签。', '用不同版本标签便于辨认，但还应记录实际 image ID。']
            ]) +
            '<p>SQLite 是本地文件数据库，本项目把它嵌入 app 进程，没有额外的 MySQL/PostgreSQL 服务。<code>expose: 3000</code> 与 <code>ports: 3000:3000</code> 不同：当前 app 没有向宿主机发布端口。<code>restart: unless-stopped</code> 能处理进程退出后的重启，Docker 的 unhealthy 状态本身并不保证自动重启；要结合日志判断问题。</p><p>构建输出是 ' +
            link('scripts/package-standalone.mjs', 1, 15, '.next/standalone 部署包') + '，脚本补齐 public、.next/static、迁移和维护命令。不能只传 server.js，也不能把 Mac 的 native SQLite 二进制随便复制到 Linux；应在兼容目标系统/架构上构建。</p>'
        },
        {
          title: '4. 文件权限与环境变量，是配置的一部分',
          html: '<p>Linux 用 UID/GID 标识文件拥有者和组，名字只是显示。<code>rwx</code> 分别表示读、写、执行；对目录，“执行”还意味着能穿过该目录访问内部条目。<code>700</code> 是拥有者可读写进入，组和其他用户无权限；<code>600</code> 是拥有者可读写文件。应用在容器内以 UID 1000 运行，挂载目录的宿主机权限必须允许它写入。镜像里提前 chown 不能覆盖 bind mount 带来的宿主机权限。</p><p>环境变量是进程启动时收到的字符串配置。改了 <code>.env</code> 后，已经运行的进程不会自动换值；Compose 配置变更后用 up 重新创建相应服务。<code>npm start</code> 脚本会读本地 .env，Compose 则按自己的插值和 environment 配置传值，两条启动路径要分清。</p>' +
            table(['变量', '本地与生产含义', '错误时的症状'], [
              ['SITE_DOMAIN', 'Compose 用它生成 HTTPS APP_ORIGIN；只写域名，不带协议和路径。', 'Compose 校验失败、证书申请不正确、请求来源不匹配。'],
              ['APP_ORIGIN', '可信公开来源，含协议与主机及必要端口；生产要求 HTTPS。', '页面能读，写接口可能 403；Cookie 安全属性也依赖它。'],
              ['DATA_DIR', 'SQLite 和私有头像的共同根目录；容器内是 /app/storage。', '读到新空库，或 SQLITE_CANTOPEN / 权限错误。'],
              ['TRUST_PROXY=1', '只有受控代理覆盖 X-Real-IP、app 端口不公开时，才信任该头。', '配置不当会使客户端地址限流失真。'],
              ['ALLOW_INSECURE_LOCALHOST=1', '仅用于隔离的本机生产构建 HTTP 测试。', '不能拿它绕过公开域名的 HTTPS 配置要求。']
            ]) +
            '<p>对照 ' + link('.env.example', 1, 6) + '、' + link('lib/server/http.js', 11, 31, '来源校验实现') + '。不要将 .env、数据库、头像、私钥或备份提交到 Git。Docker 管理权限本身很高，只交给你信任的维护账号；无需为解决某个文件写入问题把整个项目 chmod 777。</p>'
        },
        {
          title: '5. 首次上线：每一步都知道在验证什么',
          html: note('本节是实际部署操作说明；阅读与本地演练不会自动发布。', '服务器须已安装 Docker Engine 与 Compose 插件，域名和管理账号由你准备。以下仅适用于新的部署目录、空的 storage；如果已有数据，先学备份恢复课，不能按空站覆盖。系统安装细节以服务器发行版和官方文档为准。') +
            '<p><strong>先在开发机器：</strong>核对需要发布的 Git 版本、工作区改动，运行完整验证。将这份版本的源码、package-lock.json、封面图集和构建配置传到服务器的新目录；不携带 node_modules、.next、storage 或 .env。可从你有访问权的仓库检出那个提交，也可传输经过检查的源码包。</p>' +
            pre('git status --short\ngit rev-parse HEAD\nnpm run lint -- --ignore-pattern .worktrees\nnpm test') +
            '<p><strong>再在服务器的新项目根目录：</strong>先确认位置；仅当配置和数据目录尚不存在时初始化。下面用 test 防止把现有 .env 覆盖成模板。</p>' +
            pre('(\n  set -eu\n  pwd\n  test -f compose.yaml\n  test ! -e .env\n  test ! -e storage\n  test ! -e backups\n  cp .env.example .env\n  mkdir storage backups\n  sudo chown 1000:1000 storage backups\n  sudo chmod 700 storage backups\n)') +
            '<p>编辑新 .env：把 <code>SITE_DOMAIN=calendar.example.com</code> 换成自己的域名，并为本次设置一个新的 <code>APP_IMAGE=anime-calendar:你自定的版本标签</code>。DNS A 指向服务器公网 IPv4；按管理方案保留 SSH，放行 TCP 80/443。若想带上已有本地账号，此时先按部署指南恢复完整备份到空服务器，不能启动后再随手复制一个 sqlite 文件。</p>' +
            pre('docker compose config --quiet\ndocker compose build app\ndocker compose up -d\ndocker compose ps\ndocker compose logs --tail=100 app caddy') +
            '<p><code>config --quiet</code> 检查 Compose 配置能否解析；<code>build</code> 生成镜像；<code>up -d</code> 后台启动；<code>ps</code> 看状态；<code>logs</code> 看启动、证书和错误。把域名替换后，从自己的电脑检查：</p>' +
            pre('curl --fail --show-error --max-time 15 https://YOUR_DOMAIN/api/health') +
            '<p>预期响应 <code>{"ok":true}</code>。随后用浏览器建立你专门用于验收的测试账号，标记一集、刷新、退出重登，再从手机网络访问。依次核对首页、封面、HTTPS、登录、追番、已看、头像；记录提交、镜像、验证时间和结果。首次上线的完整本地账号迁移步骤在 ' +
            link('docs/deployment.md', 30, 72, '部署指南：首次启动与数据带入') + '。</p>'
        },
        {
          title: '6. 没有服务器时，先把生产构建在本机跑通',
          html: '<p>开发服务器有热更新与调试能力；生产构建更接近真实交付。下面是<strong>两个终端</strong>的隔离演练。A 先创建临时数据目录并启动服务；B 只读健康接口。退出 A 的服务后，finally 风格的 shell trap 清理该临时目录。端口 3100 若已占用，先辨认现有进程，或把两处端口一起改掉。</p>' +
            pre('# 终端 A：项目根目录；不读取真实 storage\nnpm run build\n(\n  set -eu\n  lesson_data=$(mktemp -d)\n  trap \'rm -rf "$lesson_data"\' EXIT\n  DATA_DIR="$lesson_data" APP_ORIGIN=http://127.0.0.1:3100 \\\n    ALLOW_INSECURE_LOCALHOST=1 HOSTNAME=127.0.0.1 PORT=3100 npm start\n)\n\n# 终端 B\ncurl -i --max-time 10 http://127.0.0.1:3100/api/health') +
            '<p>在浏览器访问同一个 127.0.0.1 地址，避免一会儿用 localhost、一会儿用 IP 造成来源不同。练习账号随临时目录清除而消失，这是本练习设计的隔离性质。' +
            link('scripts/start.mjs', 1, 6, 'start.mjs') + ' 在导入 standalone 前把 DATA_DIR 转为绝对路径，因为 standalone 会改变工作目录。这解释了为什么“路径相同的字符串”不一定指向同一个实际位置。</p>'
        }
      ],
      quiz: {
        question: '替换了 app 容器后，账号是否应该还在？哪项解释符合当前 Compose？',
        options: ['不会，数据库总是保存在容器内存里', '会，正常情况下 storage 是宿主机的持久化挂载，替换容器不删除它', '会，因为 Git 每次提交会保存账号数据库'],
        answer: 1,
        explanation: '当前 ./storage:/app/storage 把宿主机目录挂进容器。容器替换与该目录删除是两件事；磁盘故障、误删或错误挂载仍可能导致不可用，所以仍需独立备份。'
      },
      task: '<h3>画出你能解释的部署图</h3><p>先完成本机临时目录的生产构建演练。记录 Node 版本、构建结果、运行命令、/api/health 响应，然后画浏览器 → DNS → Caddy → app → storage 的图，在每条线上标端口/协议，在每个盒子里写清所在机器。</p><p><strong>验收：</strong>你能解释 3000 为什么不公开、UID 1000 为什么要对目录有写权限、.env 改动为何要重建相应容器、health 通过后为什么还要验证登录与刷新。本机演练记录不能写成“线上已部署”。</p>',
      resources: [
        { title: 'Docker：安装 Engine（选择服务器的发行版）', url: 'https://docs.docker.com/engine/install/' },
        { title: 'Docker：镜像是什么', url: 'https://docs.docker.com/get-started/docker-concepts/the-basics/what-is-an-image/' },
        { title: 'Caddy：自动 HTTPS 的要求', url: 'https://caddyserver.com/docs/automatic-https' },
        { title: 'Next.js：自托管', url: 'https://nextjs.org/docs/app/guides/self-hosting' }
      ]
    },
    {
      id: 'backup',
      nav: '数据：备份、恢复与回退',
      title: '敢于更新，是因为知道怎样恢复',
      subtitle: '从 WAL 的原理，到一次真正隔离的恢复演练',
      time: '70–100 分钟',
      tags: ['WAL / 快照', '校验和', '恢复 / 回退'],
      lead: '你拥有的是两类资产：能从 Git 重建的程序，以及用户不断写入、无法从源码重新生成的数据。本课把“我应该有备份”变成“我能拿证据证明这份备份可恢复”。',
      sections: [
        {
          title: '1. 数据到底在哪，丢失会损失什么',
          html: table(['资产', '当前存放位置', '恢复来源'], [
            ['程序、静态番剧目录、图集、迁移', 'Git 源码与发布镜像', '确认过的提交、锁文件、旧镜像'],
            ['账号、密码哈希、会话、追番、逐集已看', 'DATA_DIR/anime-calendar.sqlite', '包含数据库快照的完整备份'],
            ['用户头像', 'DATA_DIR/avatars/邮箱哈希/版本.webp', '与数据库快照匹配的文件'],
            ['配置与服务器管理信息', '服务器环境配置、受保护的运维记录', '单独保存的配置与访问恢复方式']
          ]) +
            '<p>源码能生成一张空 users 表，不能重新推导用户昨天标记了哪一集。Git 忽略 storage 是正确边界，不能因为 push 成功就认为账号已经备份。线上数据库与 Mac 本地数据库是两个不同文件；跨设备同步是各浏览器访问同一个线上服务，并非两台数据库自动合并。</p><p>先明确能接受多大的损失：<strong>RPO</strong> 是最多可以接受丢掉多长时间的数据，<strong>RTO</strong> 是期望多久恢复服务。例如你选择“最多丢一天、两小时内恢复”，需要相应的备份频率、异地副本与恢复演练；这些是自己制定的目标，不是本项目已经达到的承诺。</p><p>备份与原库同在一块盘，只能应对部分误操作，不能应对整盘故障。至少保存一份在另一台设备或独立存储上，控制读取权限；备份有邮箱、密码哈希、记录和头像，仍属于私有数据。</p>'
        },
        {
          title: '2. WAL：为什么复制一个 .sqlite 文件不可靠',
          html: '<p>当前 ' + link('db/sqlite.js', 36, 49, 'openDatabase') + ' 开启 WAL（write-ahead logging，预写式日志）。简化理解：修改先写进旁边的日志，提交表示这笔修改已经生效；之后 checkpoint 才把合适的内容合回主库。读取时 SQLite 会组合需要的主库与日志视图。因此“主文件看起来很新”不说明所有已提交内容已经进入主文件。</p><p>目录里可能出现 <code>anime-calendar.sqlite-wal</code> 和 <code>-shm</code>。运行时只复制主文件可能漏掉已经向用户报告成功的写入；分开复制几个变化中的文件，也不能保证得到同一时刻的一致视图。不要删除 WAL 来“清理缓存”。SQLite 的 backup API 负责得到一致数据库快照，本仓库已经提供封装。<a href="https://www.sqlite.org/wal.html" target="_blank" rel="noreferrer">SQLite 官方：WAL 工作方式</a>。</p>' +
            pre('// scripts/storage.mjs 中的核心调用\nconst live = new Database(source, { readonly: true, fileMustExist: true });\nawait live.backup(join(target, databaseName));') +
            '<p>这里的只读连接仍能读取当前已提交数据，备份目标是新文件。数据库快照解决了表内一致性，但头像是另外的文件：还需要从<strong>快照数据库</strong>读取 avatar_version，复制它实际引用的版本。这不是“把整个头像目录随便打包”。</p>'
        },
        {
          title: '3. 本仓库怎样判断一份备份完整',
          html: '<p>读 ' + link('scripts/storage.mjs', 69, 95, 'createBackup') + '，按顺序跟踪四步：创建新目录 → 备份数据库 → 从快照收集当前头像版本并复制 → 对数据库和这些头像计算 SHA-256，最后写 manifest.json。清单记录文件路径和内容摘要；之后任何一个文件字节变化，都能在恢复时被检测出来。</p>' +
            table(['步骤', '保护的性质', '边界'], [
              ['目标目录必须不存在', '不会覆盖上一份成功备份。', '每次需要一个新的备份名。'],
              ['SQLite integrity_check + 必需表查询', '数据库文件可读、基本结构可用。', '不等于所有业务逻辑都正确。'],
              ['按快照的头像版本复制', '表中当前头像与文件相匹配。', '备份期间该版本若被并发删除，会失败。'],
              ['manifest SHA-256 校验', '检测文件损坏或与清单不一致。', '摘要本身不是加密，也不能证明来源可信。'],
              ['失败清理本次新建目录', '不把半份产物留成看似可用的备份。', '失败后需要查原因并重新备份。']
            ]) +
            '<p>为什么并发换头像时宁可让备份失败？因为“数据库说有头像，备份里却没有”的成功提示会误导维护者。本项目允许正常业务继续写入数据库；头像变更导致快照引用文件消失时，脚本报错并清理。等操作结束后使用新目录重试即可。<code>manifest.json</code> 能帮助验证完整性，不会替你复制到另一台设备，也不会自动形成定期任务。</p>'
        },
        {
          title: '4. 运行一次真实但完全隔离的练习',
          html: '<p>项目根目录先有正常依赖（首次准备运行 npm ci），然后执行：</p>' +
            pre('node teach/exercises/operations.mjs') +
            '<p>脚本使用操作系统临时目录，创建一个合成账号、一部练习番剧、一集已看和头像；不会读取或修改真实 storage。它调用本仓库正在使用的备份与恢复函数，保持原库连接打开、关闭自动 checkpoint，让已提交数据留在 WAL 中，再验证恢复结果。完成或失败都会关闭连接并清理它创建的目录。</p>' +
            table(['输出', '具体证据'], [
              ['1/6 PASS', '临时库启用 WAL，并写入完整的合成数据。'],
              ['2/6 PASS', '备份有数据库、当前头像与有效 SHA-256 清单。'],
              ['3/6 PASS', '备份之后新增第 2 集；恢复仍只有快照中的第 1 集，密码哈希/追番/头像保留。'],
              ['4/6 PASS', '恢复库会话清空，原库会话和备份后记录仍在。'],
              ['5/6 PASS', '再次恢复到已有目录被拒绝，原内容保留。'],
              ['6/6 PASS + CLEANUP', '故意损坏头像后恢复失败，半份恢复目录被清理，整个临时练习被清除。']
            ]) +
            '<p>这里从数据库层写入 <code>lesson-anime</code> 是合成夹具，只用于测试存储，不经过线上 API 白名单，也不表示用户能向真实接口保存任意 ID。头像字节被当作既有存储文件备份；这项练习不验证上传接口的格式检查。</p><p><strong>停下来回答：</strong>为什么恢复后第 2 集不在？因为它发生在快照之后，这是备份时间点的含义。为什么密码哈希在、会话却不在？恢复旧会话会让过去已撤销的登录重新有效，恢复函数主动删除 auth_sessions。</p>'
        },
        {
          title: '5. 线上备份与恢复：先写新目录，验证后切换',
          html: note('以下命令会操作实际服务器数据，只在你主动维护自己的部署时使用。', '先确认 SSH 所在机器、当前项目目录和 Compose 配置。先完成上一节隔离练习。所有时间标签都生成新目录，不得把真实数据库复制进教材目录或 Git。') +
            '<p>在运行中的服务器项目根目录备份：</p>' +
            pre('(\n  set -eu\n  backup_label="backup-$(date -u +%Y%m%dT%H%M%SZ)"\ndocker compose exec -T app node scripts/backup.mjs "/app/backups/$backup_label"\nprintf \'本次备份目录：backups/%s\\n\' "$backup_label"\n)') +
            '<p>记录输出与备份名，把该目录整体复制到独立设备，包含 manifest.json 和头像子目录；只有命令成功退出才算创建完成。不要将标签写到一半就退出 shell 后猜测它是哪份。需要恢复时，先确定要回到哪个时间点，估计会丢失哪些后续写入，并暂时停止应用，保留旧存储。</p>' +
            pre('# 先填入已经核对过的备份目录名，示例不能原样运行\nbackup_label="REPLACE_WITH_VERIFIED_BACKUP_NAME"\nrestore_label="restore-$(date -u +%Y%m%dT%H%M%SZ)"\n(\n  set -eu\n  test "$backup_label" != "REPLACE_WITH_VERIFIED_BACKUP_NAME"\n  sudo test -f "backups/$backup_label/manifest.json"\n  test ! -e "storage-before-$restore_label"\n  test ! -L "storage-before-$restore_label"\n  docker compose stop app\n  docker compose run --rm --no-deps app node scripts/restore.mjs \\\n    "/app/backups/$backup_label" "/app/backups/$restore_label"\n  sudo test -d "backups/$restore_label"\n  sudo mv storage "storage-before-$restore_label"\n  sudo mv "backups/$restore_label" storage\n  sudo chown -R 1000:1000 storage\n  docker compose up -d --no-deps app\n)') +
            '<p>任何验证失败都应停止，不要继续移动目录。恢复脚本只写新目录并做校验；shell 后半段才是停机切换。若恢复校验失败，旧 storage 尚未移动，可以在确认旧代码和旧数据仍匹配后重新启动 app。若目录移动阶段失败，先检查三个目录的真实状态，再决定恢复哪一个；不要盲目重跑。详见 ' +
            link('docs/deployment.md', 101, 120, '仓库部署指南：恢复流程') + '。</p><p>切换后检查 health、日志、登录、追番、已看、头像。所有用户要重新登录；原密码哈希保留。旧 storage-before-* 和原备份先保留，验收后才按自己的保留策略处理。本节说明过程，不会自动替你停机或恢复。</p>'
        },
        {
          title: '6. 回退代码与恢复数据，要同时判断兼容性',
          html: '<p>发布前记录旧 Git commit、旧 image ID/标签、当前 schema 迁移列表和备份时间点。若新版本只有界面改动、旧程序仍兼容现有库，可以切回旧镜像再启动；若新版本改变了数据库结构，直接用旧程序打开新库可能失败甚至造成错误写入。数据库迁移是历史，不能通过修改已执行的 SQL 文件伪装成回退。</p><p>当前 ' + link('db/sqlite.js', 14, 34, '迁移执行器') + ' 为每个已执行文件保存校验和；改写旧迁移会导致 checksum mismatch。正确修复通常是新增向前迁移，或者在必要时将发布前的完整备份恢复到新目录，并配回与它兼容的旧代码。恢复快照会丢失该时间点之后的业务更新，应在选择方案时明确这项代价。</p>' +
            table(['情形', '先验证', '可能的处理'], [
              ['新 CSS 导致页面错位，schema 未变', '旧镜像确实可运行、当前库兼容。', '换回已记录旧标签，重建 app 容器，再验收。'],
              ['新程序启动报迁移 checksum mismatch', '是否误改旧 SQL、构建是否携带正确 drizzle 文件。', '恢复正确的迁移历史；不要删 __app_migrations 试运气。'],
              ['新 schema 与旧代码不兼容', '发布前完整备份是否可恢复、会丢多少新写入。', '规划停机，恢复到新目录，配回兼容版本。'],
              ['备份损坏或缺头像', '校验失败具体文件、其它独立副本。', '保留当前库，找有效备份；不要覆盖现有数据。']
            ]) +
            '<p>本项目没有自动定时备份和自动发布回退系统。先能手工正确操作，再把已验证的命令安排到可信的定时任务，并确认失败会被发现。不要把“写了一个 cron”当成“已经有可靠备份”。</p>'
        }
      ],
      quiz: {
        question: '恢复旧快照后，用户账号与追番都在，但所有人需要重新登录，最准确的解释是？',
        options: ['恢复失败了，必须把 auth_sessions 手工复制回来', '恢复函数主动撤销会话，避免旧快照复活已撤销的登录；密码与业务记录仍保留', 'SQLite 无法存储登录状态'],
        answer: 1,
        explanation: 'scripts/storage.mjs 的 restoreBackup 校验后删除 auth_sessions。恢复历史业务数据不应该让过去已退出或改密撤销的会话重新生效。'
      },
      task: '<h3>交付一份能复核的恢复记录</h3><p>运行隔离练习，保存六项 PASS 与 CLEANUP 输出。写下临时路径、备份前后各有几集、恢复后几集、会话为什么清空、校验损坏时发生什么。</p><p><strong>验收：</strong>能独立解释 RPO/RTO、WAL、快照引用的头像、摘要与加密的区别；能指出 createBackup 与 restoreBackup 的源码入口。没有真的在自己的服务器演练前，只把能力标为“本机隔离演练通过”。</p>',
      resources: [
        { title: 'SQLite：WAL 原理与注意事项', url: 'https://www.sqlite.org/wal.html' },
        { title: 'SQLite：在线备份 API', url: 'https://www.sqlite.org/backup.html' },
        { title: 'Docker：bind mount', url: 'https://docs.docker.com/engine/storage/bind-mounts/' }
      ]
    },
    {
      id: 'diagnosis',
      nav: '值守：用证据定位故障',
      title: '网站出问题时，先知道该看哪一层',
      subtitle: '请求、日志、健康检查与日常运营节奏',
      time: '70–90 分钟',
      tags: ['curl / logs', '故障树', '监测 / 升级'],
      lead: '“打不开”“不能保存”“变慢了”都是现象。有效运维是先划定受影响范围，再用低风险观察把问题缩小到一层，最后做能验证结果的修复。这里沿一次请求走过的路径来排查。',
      sections: [
        {
          title: '1. 把一句抱怨写成可检验的问题',
          html: '<p>先记录时间（注明时区）、访问域名、网络、浏览器、账号状态、步骤、预期与实际。只是一部番、一周、一台手机，还是所有用户都受影响？先在自己的浏览器复现，再看 Network 中有没有请求。如果根本没有发请求，应先检查客户端事件与 Console；如果请求发出，沿 DNS → 连接/TLS → 代理 → app → 数据库 → 响应/UI 逐层推进。</p>' +
            pre('故障记录\n时间与时区：\n影响范围：所有用户 / 单账号 / 单作品 / 单网络\nURL 和操作步骤：\n预期结果与业务依据：\n请求 method / status / 耗时：\n响应 error（脱敏）：\n相关服务日志（脱敏）：\n上一次正常时间与最近变更：\n下一步观察及它要排除的假设：') +
            '<p>不要把密码、Cookie、Authorization 或完整个人请求体贴进截图/问题单。Network 的“Copy as cURL”可能携带登录 Cookie，分享前必须删去。操作日志也不能靠打印整条 SQL 参数或请求体来换取方便。</p><p>先在下面的情景中选择证据；模拟器只演示排查思路，不向你的服务器发送请求。</p><div data-widget="incident"></div>'
        },
        {
          title: '2. curl 与 health：一条只读请求能证明多少',
          html: '<p><code>curl</code> 是命令行 HTTP 客户端。<code>-i</code> 显示响应头；<code>--max-time</code> 给总时限；<code>--fail</code> 让 4xx/5xx 导致非零退出码，便于脚本判断失败；<code>--show-error</code> 保留错误说明。仅得到 Response 不等于业务成功，和 JavaScript fetch 要检查 response.ok 是同一个道理。</p>' +
            pre('# 只读公开健康检查；替换域名\ncurl -i --max-time 15 https://YOUR_DOMAIN/api/health\n\n# 适合机器检查；不要省略域名校对\ncurl --fail --show-error --max-time 15 https://YOUR_DOMAIN/api/health\n\n# 在服务器 Compose 项目目录，从 app 内部检查\n# 使用 Node fetch，因此不要求镜像预装 curl\ndocker compose exec -T app node -e \\\n  "fetch(\'http://127.0.0.1:3000/api/health\').then(async r => { console.log(r.status, await r.text()); process.exitCode = r.ok ? 0 : 1; }).catch(() => { process.exitCode = 1; })"') +
            '<p>' + link('app/api/health/route.ts', 1, 15, '健康接口') + ' 实际查询 __app_migrations，成功返回 200 与 <code>{"ok":true}</code>，失败返回 503。内部成功、外部失败，把怀疑重点移到 DNS、端口、TLS、代理；内部也失败，再看 app 与数据库。health 不是全面验收：它不验证密码流程、头像是否齐全、单集是否算对，也不证明所有用户网络可达。</p><p>用模拟请求练习 method、Origin、Cookie 与响应状态的关系：</p><div data-widget="http"></div>'
        },
        {
          title: '3. 状态码缩小范围，不替代读错误原因',
          html: table(['现象', '优先找的证据', '本项目中怎样处理'], [
            ['401 未认证', '该请求是否携带 ac_session；会话是否过期/改密/退出/恢复后撤销。', '重新登录并观察 Set-Cookie 与随后请求；UI 显示昵称不证明服务器认可身份。'],
            ['403 来源拒绝', 'Origin 与 APP_ORIGIN 是否精确相同，含协议与端口；是否跨站。', '手机访问 IP 与 localhost 不同。修配置并重启相应服务，保留来源校验。'],
            ['400 / 413 / 415', 'payload、Content-Type、实际体积与路由验证。', '确认 JSON 格式/字段/头像大小；代理与应用可能各有体积限制。'],
            ['429 过多尝试', 'Retry-After、是单账号还是所有地址；最近是否反复测试登录。', '按响应等待，查账号尝试与可信代理；不要删除限流来“修复”。'],
            ['500 / 503', 'app 日志中的操作名和安全错误码；内部 health。', '检查数据路径、权限、磁盘、迁移与依赖；区分接口失败与整体库不可读。'],
            ['502 代理网关错误', 'Caddy 日志、app 状态、内部 health、服务名和端口。', '代理没得到可用上游响应；可能 app 未启动、崩溃或不可达，先看上游。'],
            ['无 HTTP 状态、DNS/TLS/连接错误', '解析结果、证书名称、开放端口、网络差异。', '尚未到业务接口；改 React 或清数据库不能修好连接。']
          ]) +
            '<p>HTTP 状态码有标准含义，具体失败原因仍要结合接口实现。<a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status" target="_blank" rel="noreferrer">MDN：HTTP 状态码</a>。来源检查见 ' +
            link('lib/server/http.js', 11, 31) + '，限流见 ' + link('lib/server/http.js', 90, 112) + '。当前限流存于单进程内存；重启可能清空计数，但重启不是处理恶意尝试或配置错误的长期方案。</p><p>已看 PUT 返回 200 但刷新后不对时，接着看同账号 GET 返回什么；GET 正确而画面错，去查状态合并/筛选/渲染。先保存证据，避免“刷新几次好了”掩盖竞态。</p>'
        },
        {
          title: '4. 日志、磁盘、权限、容量：常用只读观察',
          html: pre('# 服务器项目目录\ndocker compose ps\ndocker compose logs --since=15m --tail=200 app caddy\ndocker stats --no-stream\ndf -h\ndf -i\nls -ld storage backups\ndocker compose exec app id\n\n# Linux 服务器：查看监听端口（是否需要 sudo 取决于权限）\nss -ltn') +
            '<p><code>logs --since</code> 让你围绕故障时刻看日志；<code>docker stats</code> 看容器 CPU/内存；<code>df -h</code> 看磁盘空间，<code>df -i</code> 看 inode，很多小文件也可能耗尽后者。<code>ls -ld</code> 看目录自身权限，<code>id</code> 看实际运行用户。<code>ss</code> 是 Linux 常见工具，在 Mac 可用 <code>lsof -nP -iTCP -sTCP:LISTEN</code> 观察监听进程。</p>' +
            table(['证据', '合理的下一步', '不应直接做'], [
              ['SQLITE_CANTOPEN / EACCES', '确认 DATA_DIR、目录存在、挂载路径和 UID 1000 权限。', '删库重建或 chmod 777 整个磁盘。'],
              ['SQLITE_FULL / 磁盘接近耗尽', '找出备份、镜像、日志增长来源，先保留有效备份再按策略清理。', '删除 -wal、未知 storage 或所有 Docker volumes。'],
              ['SQLITE_BUSY', '看是否有额外进程/长事务占用写锁；当前 busy timeout 为 5 秒。', '默认改成多个 app 实例共享库。'],
              ['内存持续偏高或容器重启', '看日志与内存时间趋势，区分构建时峰值、泄漏、请求负荷。', '把一次瞬时 stats 当成容量结论。'],
              ['迁移 checksum mismatch', '核对发布提交、drizzle 文件、已应用历史是否被改写。', '删迁移表让它重新执行。']
            ]) +
            '<p>当前 Compose 的日志设置每文件 10m、最多 3 份，用于限制本机日志增长；它没有配置完整的请求访问日志平台。应用日志只记录操作名与安全错误码，某些排查需要先在隔离本地复现，然后在服务端设断点。不要声称日志一定包含所有请求和完整堆栈。</p><p>并发容量要测量。平均并发请求数可用“请求到达率 × 平均处理耗时”做量级理解，但不能用它直接宣称最大 QPS。观察分位耗时、错误率、CPU、内存与数据库写锁，再在授权的隔离环境做接近真实负荷的测试。本项目是单 app、SQLite 本地盘、内存限流；扩容前要重新设计这些共享状态边界。</p>'
        },
        {
          title: '5. 建立一个能坚持的维护节奏',
          html: '<p>运营首先是让使用者能够稳定获得正确内容。监测“进程在”不够：外部健康、业务抽查、备份是否新鲜、磁盘余量和数据更新都需要关注。下面是一份可调整的个人站起点；频率应与你的 RPO、流量和发布节奏匹配，它不会由这个教材自动执行。</p>' +
            table(['时机', '动作', '留下的证据'], [
              ['日常 / 有用户反馈时', '从外部检查 health；看失败/重启，核对最新备份时间与磁盘余量。', '时间、HTTP 状态、日志摘要、备份目录名。'],
              ['每次发布前', '确定准确提交，lint + npm test；创建完整备份，记录旧镜像与恢复路径。', '提交 SHA、检查结果、备份成功、回退依据。'],
              ['每次发布后', 'health、HTTPS、登录、追番、已看、头像、手机访问；观察日志。', '发布版本、验收账号的脱敏结果、失败项。'],
              ['定期 / 依赖安全公告后', '检查 Node/Next/依赖支持与安全更新，在独立分支验证；检查系统维护策略。', '升级原因、版本差异、完整测试与发布记录。'],
              ['定期恢复演练', '从独立副本恢复到新目录，用隔离实例验证。', '实际耗时、恢复数据时间点、记录/头像/会话结果。'],
              ['季度资料变化时', '按数据课的来源顺序更新目录和图集，核对 ID 与排期。', '来源、生成 diff、数据测试；部署本身不会刷新目录。']
            ]) +
            '<p>依赖漏洞报告是风险线索，应查实际受影响版本和本项目的触发条件，再做有测试的升级；不要无条件执行 <code>npm audit fix --force</code>。读取官方公告、锁定变更范围、验证准确产物，比一次性升所有包更容易定位回归。</p><p>当前账号是邮箱形式的站内登录名，没有发邮件验证或找回密码服务。维护者应如实说明现有能力；不能从密码哈希“查出原密码”。公开运营若涉及数据处理或内容授权，应查适用于你的实际地区与来源的要求；本教材不把某种地区、备案或授权结论当成永久规则。</p>'
        },
        {
          title: '6. 一次升级怎样形成闭环',
          html: '<p>先定义改动目的与可见预期；确认工作区和远端关系，避免把别人的并发更新覆盖。小变更用专门分支，先复现再最小修复。数据、认证、数据库或 UI 改动按仓库约定完整执行：</p>' +
            pre('npm run lint -- --ignore-pattern .worktrees\nnpm test\ngit diff --check\ngit diff --stat') +
            '<p>读 ' + link('scripts/test.mjs', 14, 26, '测试环境构造') + ' 与 ' + link('scripts/test.mjs', 43, 74, '真实服务测试与清理') + '：npm test 先 typecheck 和 build，再用临时 DATA_DIR 启动真实 standalone，运行测试，关闭进程并删临时数据。这覆盖了配置、路由和数据库的一部分集成行为；仍需发布环境验收。</p><p>在自己的服务器发布时，先备份，记录旧镜像，将新版本标签配置到 APP_IMAGE，再构建并重建 app；Caddy 配置没变时无需随意重建它。检查健康与业务后，才记为成功。出现问题时，根据上一课判断能否只退镜像或必须恢复兼容快照。</p>' +
            pre('# 已确认代码版本、备份成功、APP_IMAGE 使用新标签后\ndocker compose build app\ndocker compose up -d --no-deps app\ndocker compose ps\ndocker compose logs --since=5m --tail=100 app') +
            '<p>一次检查通过所证明的是“这个版本在这些输入和环境下通过了这些检查”。持续记录已覆盖与未覆盖的部分，才能知道下一次故障应该从哪里开始。</p>'
        }
      ],
      quiz: {
        question: '公网访问 502，但 app 容器内 /api/health 返回 200；下一步最有区分力的检查是什么？',
        options: ['删除 SQLite，排除数据脏了', '查看 Caddy 错误日志、上游地址与容器网络连通性，核对访问的实际域名', '修改前端 CSS 并重新构建'],
        answer: 1,
        explanation: '内部 health 证明 app 至少能处理健康请求并读取库；外部经过的代理/路由路径仍可能不同。先查 Caddy 和实际访问入口，不能把所有故障都归到数据库。'
      },
      task: '<h3>完成一份故障定位记录</h3><p>选择模拟器中的一个情景，写出最初的三个假设、每次观察排除了什么、根因证据、最小修复与验证。然后对部署课的隔离服务，用 curl 记录 /api/health 的 200 响应，停止该服务后再请求，观察没有 HTTP 响应的连接失败；再解释它与“服务器已响应 503”的区别。</p><p><strong>验收：</strong>知道连接失败没有收到 HTTP 响应；能区分浏览器 Console、Network、app 日志和 Caddy 日志；能根据 401/403/429/502 各选下一条证据。不要为练习故障去破坏真实站点。</p>',
      resources: [
        { title: 'MDN：HTTP 响应状态码', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status' },
        { title: 'curl：命令手册', url: 'https://curl.se/docs/manpage.html' },
        { title: 'Docker Compose：logs', url: 'https://docs.docker.com/reference/cli/docker/compose/logs/' },
        { title: 'Node.js：不要阻塞事件循环', url: 'https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop' }
      ]
    },
    {
      id: 'graduation',
      nav: '结业：完成一次独立维护',
      title: '用一组可以复核的结果，检验你是否会维护',
      subtitle: '源码解释、最小修改、数据恢复与发布演练',
      time: '3–6 小时，可分两次',
      tags: ['综合练习', '证据 / 复核', '能力边界'],
      lead: '看懂教程与独立维护之间还隔着一次完整实践。结业不考术语数量，而是给你一个任务时，能否找到入口、控制改动、验证结果，并在失败时保住数据。网页记录的是学习进度，不是职业资格或能力认证。',
      sections: [
        {
          title: '1. 先写一张你自己的项目地图',
          html: '<p>合上前面的内容，用纸或文本画出以下链路：浏览器打开首页 → Next 输出 HTML/CSS/JS → React 处理点击 → fetch 调 API → session 确认账号 → 校验输入 → SQLite 事务 → 响应 → 客户端状态。再为部署画出 DNS、Caddy、app、storage 与 backups 的位置。</p><p>每个箭头都回答三个问题：传递的是什么？可能怎样失败？在什么工具里能看到证据？例如 Cookie 是浏览器随请求发的会话凭据，不能把它画成“浏览器直接读数据库”。</p>' +
            table(['要证明你理解的边界', '至少指出一个源码位置', '合格的解释'], [
              ['UI 状态与服务器记录', 'app/hooks/use-viewer.tsx', '乐观 UI 可能先变；刷新后的 GET 来自服务器，旧账号请求不能污染新账号。'],
              ['认证与来源校验', 'app/auth.ts、lib/server/http.js', 'session 决定是谁，Origin 检查请求来源；二者都不能被页面昵称替代。'],
              ['事务与异步', 'app/api/anime-selections/route.ts', '同步事务包含删除和全部插入；外部 await 工作不放在其中。'],
              ['构建与数据', 'Dockerfile、compose.yaml', '镜像包含程序；storage 由宿主机挂载，Git 不保存账号。'],
              ['备份与恢复', 'scripts/storage.mjs', '数据库快照及其头像一起校验；恢复写新目录并撤销会话。']
            ]) +
            '<p>如果不能说明哪个文件负责一个环节，回到源码导航查证再改图。不要凭熟悉的名词填空；准确画出当前实现，比画一套理论上更复杂的架构更有价值。</p>'
        },
        {
          title: '2. 练习 A：从一条规则，完成一次最小修复',
          html: '<p>先在独立练习中完成前面课程提供的红 → 绿流程，再挑一个范围小、你能明确预期的维护任务。例如已有排期边界的测试扩充、一个可复现的显示文案问题。不要用线上账号、改生产数据库或大规模升级依赖作为第一次练习。</p>' +
            pre('维护记录 A\n业务规则：输入是什么，正确输出是什么？\n最小反例：哪一步或哪个边界能稳定复现？\n入口：纯函数 / React 组件 / API / 存储？\n测试：修改前失败的断言是什么？\n修复：为什么这些行足以消除根因？\n验证：相关测试、完整 npm test、lint 的实际结果。\n范围：git diff 是否只包含相关文件？\n剩余风险：哪些环境或路径还没验证？') +
            '<p>利用你熟悉的竞赛测试习惯：区分正常、空输入、边界和异常输入。这里还要多考虑“状态随时间变化”：发起请求后账号切换、保存失败时另一次已成功、页面刷新后重新加载。业务状态的时间线就是反例构造的一部分。</p><p><strong>验收：</strong>别人仅看这份记录，就能复现旧问题、理解修复理由并重跑检查。若原行为其实符合规则，允许结论是“不需要改代码”，但必须给证据；为了交作业而制造改动不加分。</p>'
        },
        {
          title: '3. 练习 B：证明你的数据恢复知识能运行',
          html: '<p>重新运行隔离操作脚本，不看提示，先写下你预测的六项结果，再核对实际输出：</p>' +
            pre('node teach/exercises/operations.mjs\nnode --test tests/database.test.mjs tests/storage-operations.test.mjs') +
            '<p>这两条命令分别给出可读演练和仓库现有故障回归。用自己的话解释：为什么只恢复第 1 集；为什么会话数量变为 0；为什么损坏的头像能阻止发布恢复目录；为什么已有目录拒绝覆盖。解释时指出实际断言或 ' +
            link('scripts/storage.mjs', 97, 123, '恢复源码') + '，不能只写“脚本说 PASS”。</p><p>再做一个桌面推演：你在 18:00 备份，19:00 发布，19:20 发现 schema 不兼容。如果恢复 18:00 快照，18:00 之后的写入怎么办？先列出损失与替代方案，不能承诺无损回退。如果尚无实际服务器，本练习可以完成，但证据应准确写“本机临时目录”，不能写“生产恢复验证”。</p>'
        },
        {
          title: '4. 练习 C：把构建产物当成真实服务验收',
          html: '<p>按部署课的双终端方式，用新的临时 DATA_DIR 启动 standalone。本机浏览器建立一个<strong>专用于练习</strong>的账号，选择作品、标记一集、上传练习头像，刷新、退出、重新登录，检查所有记录。用 Network 保存脱敏的请求方法、状态和响应结构。</p>' +
            table(['验收动作', '预期现象', '证据'], [
              ['GET /api/health', '200 与 ok:true', 'curl 状态与正文，记录 origin。'],
              ['注册后 GET /api/auth/me', '身份由服务器返回', '不含 token 的响应结构。'],
              ['追番与单集标记后刷新', '服务器记录仍在', 'PUT 成功及随后 GET 的对应 ID/集数。'],
              ['改密后旧会话再访问', '旧会话不再有效，需要重新登录', '在练习环境观察退出/401，不泄露 Cookie。'],
              ['上传/移除头像', '当前版本正确，个人接口受认证保护', '头像 URL 结构与刷新后的状态。'],
              ['停止临时服务', '后续请求连接失败，演练临时目录清理', '与应用返回 503 的区别。']
            ]) +
            '<p>如果你有自己的试运行服务器，可以进一步按部署课完成 DNS/HTTPS、容器权限、数据挂载与恢复验收。试运行与正式用户数据分开；先有明确版本和恢复办法，再切换真实服务。本教材没有替你购买服务器、发布或更改已有站点。</p>'
        },
        {
          title: '5. 练习 D：收到故障报告，写出最小处置方案',
          html: '<p>任选两题，必须先写“我要观察什么”，再写“我准备改什么”。</p>' +
            table(['报告', '至少要获取的两项证据', '需要避免的误判'], [
              ['电脑能看，手机保存总是 403。', '手机请求 Origin；实际 APP_ORIGIN/访问地址。', '把能打开首页当成写接口配置正确。'],
              ['换镜像后发现账号都不见了。', '当前 DATA_DIR 与挂载；旧 storage 是否仍在。', '立即重新注册并覆盖原有数据。'],
              ['更新后 502，Docker 显示 app 反复重启。', 'app 启动日志；旧/新版本与迁移记录。', '先改 Caddy 超时掩盖进程崩溃。'],
              ['磁盘快满了，看到很大的 sqlite-wal。', '空间/inode、WAL 活跃情况、长事务与备份。', '把 WAL 当作可随意删除的缓存。'],
              ['恢复后用户都被退出了。', '账号和业务数据是否保留；restoreBackup 的会话撤销逻辑。', '把预期安全行为当成数据丢失。']
            ]) +
            '<p>每题的结束条件要明确，例如“来源配置重建后，手机的同一操作返回 200，刷新 GET 记录一致”，而不是“看起来好了”。若没有足够证据，就把不确定性写下并继续只读观察，别用大范围修改测试猜想。</p>'
        },
        {
          title: '6. 分级自评：根据证据决定下一步能独立做什么',
          html: '<p>下面是学习自评，不是自动评分或上线授权。课程的勾选、选择题与进度仅保存在当前浏览器；它们不能观察你在终端执行的操作，也不能认证你已经具备生产维护能力。</p>' +
            table(['级别', '应有的证据', '适合承担的任务'], [
              ['1 · 能解释', '能自己画请求/部署图，读懂关键函数，做对概念题并解释错误选项。', '读源码、复现问题、整理带证据的故障报告。'],
              ['2 · 能在本机维护', '独立完成最小修复、完整测试、隔离备份恢复与 standalone 业务验收。', '日常开发与小改动，发布前准备可复核的版本。'],
              ['3 · 能维护试运行服务', '在自己的隔离服务器验证 DNS/TLS/挂载/权限；从独立备份恢复，记录真实耗时。', '按已验证手册发布、监测和处理常见故障。'],
              ['4 · 能承担当前项目日常运营', '多次发布与恢复记录，明确 RPO/RTO、备份保留、升级流程和故障处置边界。', '独立管理当前单实例系统，知道什么时候需要进一步学习或请人复核。']
            ]) +
            '<p>如果第 2 级已有证据但尚未做服务器实践，可以准确说“已掌握本地维护流程，正在补部署经验”。不能因为看完教材就跳过试运行。反过来，偶然把网站启动起来也不能替代数据恢复与错误处置能力。</p><p>完成这些练习后，你的下一步应由实际问题决定：流量增长再学负载测试与容量；新增功能再学设计与迁移；出现运营需求再学监测与账号恢复。当前目标是可靠维护这一个项目，不需要先掌握所有 Web 框架和分布式系统技术。</p>'
        }
      ],
      quiz: {
        question: '教材进度显示 100%，最诚实的能力说明是哪项？',
        options: ['静态网页已认证我可以独立维护生产站点', '已完成阅读标记；是否掌握要看我独立完成的测试、恢复、部署和故障处置证据', '以后只需自动升级依赖，测试和备份可以省略'],
        answer: 1,
        explanation: '阅读进度与选择题只能辅助学习；真实维护能力需要可重现操作、验证结果与对失败边界的理解。不要把浏览器本地勾选当作能力证书。'
      },
      task: '<h3>你的最终交付：一份维护档案</h3><p>归档项目地图、最小修复记录、完整检查结果、六项恢复练习输出、standalone 验收记录与两份故障推演。记录实际日期、环境与提交版本，删去凭据和个人数据。逐项标注“已实做 / 只推演 / 尚未验证”。</p><p><strong>完成标准：</strong>另一位有编程基础的人能按你的记录重复本机练习；你能准确指出线上部分哪些还未实践；你知道出错时怎样保留数据并停止扩大影响。这比写一句“学完了 Node.js”更有用。</p>',
      resources: [
        { title: 'MDN：Web 开发学习资料', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development' },
        { title: 'Node.js：入门介绍', url: 'https://nodejs.org/en/learn/getting-started/introduction-to-nodejs' },
        { title: 'SQLite：在线备份原理', url: 'https://www.sqlite.org/backup.html' }
      ]
    }
  );
})();
