(() => {
  const pre = code => '<pre><code>' + code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</code></pre>';
  const link = path => `<button class="source-link" data-source="${path}" data-start="1" data-end="1">${path} ↗</button>`;
  const table = (heads, rows) => '<div class="table-wrap"><table><thead><tr>' + heads.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
  const additions = [
    {
      id: 'node', nav: 'Node：把项目在本机跑起来', title: 'Node.js、npm、Next.js 各是什么？', subtitle: '从一个 .cpp 文件，走到持续运行的服务', time: '60–90 分钟', tags: ['运行时', 'npm / 依赖', '进程与端口'],
      lead: '你熟悉“源代码 → 编译 → 执行”。网站依然遵守这条逻辑，只是同时涉及浏览器与服务器，而且服务器要持续等待请求。先把工具各自的工作分清楚。',
      sections: [
        { title: '1. 语言、运行时、包管理器、框架不是同一层', html: table(['名字', '职责', '联系你的经验'], [
          ['JavaScript', '运行的语言，描述值、函数和控制流。', '类似你写 Python 或 C++。'],
          ['TypeScript', '在 JavaScript 上增加静态类型，构建时处理类型标记。', '帮助发现类型错误，但不是网络输入的证明。'],
          ['Node.js', '在浏览器之外执行 JavaScript，提供文件、进程、HTTP 等 API。', '类似用 python 启动解释器；不自带网页界面。'],
          ['npm', '安装依赖，按 package.json 执行脚本。', '依赖管理类似 pip；npm run 的命令由项目自己定义。'],
          ['React / Next.js', 'React 描述界面；Next 组织路由、服务端处理与构建。', '它们运行在运行时上，而不是取代 Node。']
        ]) + '<p>浏览器和 Node 都能执行 JavaScript，但环境提供的对象不同：浏览器有 <code>document</code>；Node 有文件系统 API。不能因为同为 .js 就在客户端导入数据库模块。Next 负责将不同用途的代码放到合适的执行位置。</p>' },
        { title: '2. package.json 是这个项目的命令目录', html: '<p>先打开 ' + link('package.json') + '。<code>dependencies</code> 是运行和构建应用所依赖的包，<code>devDependencies</code> 主要服务开发检查；安装模式会影响它们是否安装。<code>scripts</code> 的名字只是入口，真正动作在右侧字符串。</p>' + table(['命令', '具体发生什么', '如何知道成功'], [
          ['npm ci', '按锁文件安装；已有 node_modules 会被重建。要求 package.json 和锁文件一致。', '退出码为 0；不是更新依赖的命令。'],
          ['npm run dev', '启动 Next 开发服务；改源代码后快速更新。', '终端显示访问地址，进程继续运行。'],
          ['npm run build', 'Next 构建，再打包 standalone 静态资源和维护脚本。', '.next/standalone/ 生成；命令退出成功。'],
          ['npm start', '读取环境配置，启动已生成的 standalone 服务。', '页面可访问且 /api/health 可实际读取数据库。'],
          ['npm test', '类型检查、构建、隔离的真实 HTTP 与回归测试。', '完整测试命令退出成功；不能用只跑单元测试替代。']
        ]) + '<p><code>package-lock.json</code> 记录解析后的依赖树。改依赖时要连同锁文件审阅，不要删掉锁文件来掩盖安装问题。<code>better-sqlite3</code> 带原生二进制模块，这和 C++ 编译结果一样依赖系统、架构与 ABI；Mac 的 node_modules 不应直接上传给 Linux 使用。</p>' },
        { title: '3. 在隔离目录运行你的第一份本地服务', html: '<p>以下在 Mac 的项目根目录执行。先确认当前目录与 Node 版本；本仓库要求 Node ≥22.13.0，Dockerfile 使用 Node 24。若尚未安装，请按 Node 官方安装页面选择与系统兼容的版本。</p>' + pre('pwd\nnode --version\nnpm --version\nnpm ci\nTEACH_DATA_DIR=$(mktemp -d "${TMPDIR:-/tmp}/anime-calendar-learn.XXXXXX")\nprintf "%s\\n" "$TEACH_DATA_DIR"\nDATA_DIR="$TEACH_DATA_DIR" APP_ORIGIN=http://localhost:3000 npm run dev -- --hostname 127.0.0.1 --port 3000') + '<p>保留打印出的临时目录路径。最后一条不会立刻返回命令提示符：服务正在等待请求，这是正常现象。打开 <code>http://localhost:3000</code>，另开终端运行 <code>curl -i http://localhost:3000/api/health</code>，应看到 HTTP 200。按 Control-C 停止服务，临时目录仍在，数据寿命长于进程。</p><p>如果 3000 已被占用，先用 <code>lsof -nP -iTCP:3000 -sTCP:LISTEN</code> 找到进程；不要随手杀掉不认识的进程。可改用 3001，同时修改 APP_ORIGIN、访问地址并把 dev 命令的 <code>--port 3000</code> 改为 <code>--port 3001</code>。</p><div class="callout amber"><strong>这里的临时目录是练习库。</strong><p>它避免向你日常使用的 storage 写测试账号。重启时传入同一个绝对路径才能看见同一批记录。关闭终端会失去变量值，但不会自动删除目录。下次可从保存的路径重新设置变量。</p></div>' },
        { title: '4. 环境变量、工作目录与退出码', html: '<p><code>DATA_DIR=... npm run dev</code> 把环境变量传给该次命令及子进程；它不是 TypeScript 变量。<code>$PWD</code> 是当前目录。相对路径 <code>./storage</code> 从进程工作目录解析，所以生产维护更适合使用已核对的绝对路径。</p><p><code>.env</code> 是配置文件，只有程序或启动工具主动读取才生效。当前 npm start 通过 Node 的 env-file 选项读取，Next 开发服务也有自己的环境加载规则。修改后通常需要重启。<code>NEXT_PUBLIC_</code> 前缀会让 Next 将对应变量用于浏览器构建，绝不能用于秘密。这里公开的占位示例见 ' + link('.env.example') + '。</p><p>进程退出码 0 表示成功，非零表示失败；日志里最后一句不一定是根因，要向上找到首个错误。<code>npm run build</code> 成功后修改源码，再直接 npm start，运行的仍是旧构建。构建产物不会凭空跟着源文件变。</p>' },
        { title: '5. 构建与启动的证据链', html: '<p>读 ' + link('next.config.ts') + ' 的 output，再读 ' + link('scripts/package-standalone.mjs') + ' 和 ' + link('scripts/start.mjs') + '。standalone 不仅包含服务 JS，还需要 public、.next/static、SQL 迁移和维护脚本。只有 server.js 能启动，并不保证封面和数据库迁移可用。</p>' + pre('npm run build\n# 在设置过 TEACH_DATA_DIR 的终端执行；先停止开发服务\nDATA_DIR="$TEACH_DATA_DIR" APP_ORIGIN=http://localhost:3000 ALLOW_INSECURE_LOCALHOST=1 HOSTNAME=127.0.0.1 PORT=3000 npm start') + '<p>这个 HTTP 例外只用于本机生产模式验证。真实域名部署要使用 HTTPS 配置。现在重做访问、登录、刷新检查，理解“开发时正常”与“生产构建正常”是两条证据。</p>' }
      ],
      quiz: { question: '修改了组件后直接 npm start，页面仍旧，最可能缺哪一步？', options: ['重新 npm run build，再重启已有服务', '删除 SQLite 数据库', '把 Node 换成 React'], answer: 0, explanation: 'start 运行的是先前生成的 standalone 构建；源码修改后必须重新构建。删除数据库不会更新前端代码，反而会丢失账号记录。' },
      task: '<h3>留下可复现的运行记录</h3><p>完成一次隔离开发启动和一次 standalone 启动，记下 Node 版本、工作目录、DATA_DIR 绝对路径与健康接口状态。注册一个练习账号，停止并用同目录重启，核对追番仍在。</p><p><strong>验收：</strong>不用背命令也能解释 dev/build/start 的差别，并说明为什么重启进程不会清空这个练习库。不要将临时账号或配置提交到 Git。</p>',
      resources: [{ title: 'Node：浏览器与 Node 的区别', url: 'https://nodejs.org/en/learn/getting-started/differences-between-nodejs-and-the-browser' }, { title: 'npm ci 官方说明', url: 'https://docs.npmjs.com/cli/v11/commands/npm-ci' }]
    },
    {
      id: 'async', nav: '异步：请求不是普通函数调用', title: 'await 等待时，别的事情还会发生', subtitle: 'Promise、事件循环、闭包与竞态', time: '50–70 分钟', tags: ['Promise', 'async / await', '竞态与错误'],
      lead: '算法题常假设输入已经在内存里，函数按顺序完成。网站要等待网络和磁盘，还会遇到用户连续点击、退出和重登。你需要同时理解控制流与时间线。',
      sections: [
        { title: '1. Promise 表示未来的结果', html: '<p>Promise 是一个状态对象：pending 最终转为 fulfilled 或 rejected。<code>async</code> 函数总返回 Promise。<code>await</code> 暂停的是当前 async 函数后续执行，等待该 Promise 完成；它不保证其它请求、事件或状态都停止。</p>' + pre('console.log("A");\nasync function work() {\n  console.log("B");\n  await Promise.resolve();\n  console.log("C");\n}\nwork();\nconsole.log("D");') + '<p>先预测，再用 Node 或浏览器控制台运行。输出是 A、B、D、C。work 立即执行到 await，之后的继续执行排入微任务。真实 fetch 等待时间不确定，但这种“当前函数让出后续执行”的模型仍然成立。</p>' },
        { title: '2. HTTP 500 不一定进入 catch', html: pre('async function loadSelections() {\n  const response = await fetch("/api/anime-selections");\n  if (!response.ok) {\n    throw new Error(`HTTP ${response.status}`);\n  }\n  const payload = await response.json();\n  if (!Array.isArray(payload.animeIds)) {\n    throw new Error("Invalid response");\n  }\n  return payload.animeIds;\n}') + '<p>这是教学缩写。fetch 在收到 401、403、500 时通常仍成功返回 Response：网络传输成功，不等于业务成功。你必须判断 response.ok。断网等网络错误会拒绝 Promise；解析 JSON 也可能失败。这是三种不同故障，调试时先在 Network 看原始响应。</p><p>读取真实实现 ' + link('app/hooks/use-viewer.tsx') + '，比较 accountRequest 与个人记录加载。<code>try/catch/finally</code> 分别处理正常结果、异常和收尾；不要在 catch 中把错误吞掉后假装保存成功。</p>' },
        { title: '3. 单线程也会有竞态', html: table(['时刻', '事件', '风险'], [
          ['t₀', '账号 A 发起读取，尚未返回。', '请求携带的是 A 当时的会话。'],
          ['t₁', '用户退出并登录 B，界面切换。', '当前状态已属于 B。'],
          ['t₂', 'A 的旧请求返回。', '如果直接 setState，会把 A 的旧结果放进 B 的界面。']
        ]) + '<p>这不是两个 CPU 指令同时写内存，而是异步任务跨越了状态变化。项目使用会话版本和 AbortController：开始请求时记住版本，结果回来时确认仍是当前会话，再更新。只比较邮箱也不充分，同一账号退出再登录也应视为新的会话。</p><p>版本检查还必须覆盖失败回滚。否则一个旧请求在 B 登录后失败，catch 会把旧快照“恢复”到 B。已看操作要只恢复该请求涉及的单集，不能用整个旧数组覆盖其它已经成功的更新。</p>' },
        { title: '4. 同步调用仍然会阻塞 JavaScript', html: '<p>Node 通过事件循环与系统 I/O 协作处理许多等待中的任务；这不表示每行代码都并行，也不表示所有 I/O 都异步。一个很长的 CPU 循环会阻塞本线程继续响应。当前 better-sqlite3 的查询和事务回调是同步的，所以事务内应短小、显式执行语句。</p><p><code>await getDb()</code> 只说明取得连接的接口返回 Promise，不能推出 <code>db.transaction</code> 的回调允许 async。密码哈希、文件上传等异步工作放在同步事务外。连接生命周期见 ' + link('db/index.ts') + '。</p><div data-widget="http"></div>' }
      ],
      quiz: { question: '账号 A 的旧请求，在 B 登录后才返回。该怎样处理？', options: ['只要 HTTP 200 就覆盖当前列表', '确认请求所属会话仍有效后再写状态，否则忽略', '在请求前等待固定 1 秒'], answer: 1, explanation: 'HTTP 成功并不能证明结果属于当前会话。版本检查建立结果与会话的对应关系；固定等待时长无法消除不确定的网络顺序。' },
      task: '<h3>亲手追踪一段异步流程</h3><p>运行 A/B/C/D 例子。用编辑器在 use-viewer.tsx 找出一次 GET 的版本记录、成功更新、失败处理和取消清理。再运行 <code>node --test tests/auth-client-flow.test.mjs</code>，阅读其中处理旧请求的断言。</p><p><strong>验收：</strong>能画出“发请求 → 切账号 → 旧结果到达”的三个事件，并在代码里指认阻止污染的条件。理解 AbortController 不能替你撤销服务器上已经提交的写入。</p>',
      resources: [{ title: 'Node：事件循环', url: 'https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick' }, { title: 'MDN：使用 Fetch', url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch' }]
    },
    {
      id: 'markup', nav: '界面：HTML、CSS 与浏览器工具', title: '先理解浏览器，再理解组件', subtitle: '元素树、盒模型、布局与可访问交互', time: '50–70 分钟', tags: ['HTML / DOM', 'CSS', '开发者工具'],
      lead: 'React 最终仍要通过浏览器的元素和样式显示内容。理解浏览器如何计算布局，才能解释“按钮存在但点不到”“手机排版坏了”这些现象。',
      sections: [
        { title: '1. HTML 是有语义的树', html: pre('<main>\n  <h1>查询番剧</h1>\n  <label for="query">番名</label>\n  <input id="query" type="search">\n  <button type="button">查看详情</button>\n</main>') + '<p>标签不是随便起的盒子名。main 表示主要内容，h1 表示页面主标题，label 让输入有可识别的名称，button 自带键盘交互。把可点击 div 换成按钮，解决的不只是样式，而是焦点、键盘和辅助技术如何操作它。</p><p>DOM 是浏览器解析后的元素树，可能被 JavaScript 更新；“查看页面源代码”的初始 HTML 与 Elements 面板的当前 DOM 不一定相同。项目中的 JSX 用 className 对应 HTML 的 class，用花括号插入表达式。</p>' },
        { title: '2. 样式由匹配、层叠和继承共同决定', html: '<p>CSS 规则由选择器和声明组成。多个规则命中同一元素时，按层叠来源、优先级与顺序等规则决定生效值；有些属性从父元素继承。排查颜色先看 Computed，而不是反复追加 !important。</p>' + pre('/* 教学示意：消费已有 token */\n.lesson-card {\n  color: var(--ink);\n  padding: 1rem;\n  border: 1px solid var(--line);\n}\n/* 真实番剧应用使用自己的 --accent、--paper 等 token */') + '<p>本项目应用样式入口 ' + link('app/globals.css') + ' 按顺序导入文件；颜色定义在 ' + link('app/styles/tokens-base.css') + '。亮暗主题覆盖同名变量，组件只消费变量。学习站有独立样式文件，不要把两者的 token 名混用。</p>' },
        { title: '3. 盒模型、Flex 与 Grid 各解决什么', html: table(['概念', '含义', '维护时观察什么'], [
          ['盒模型', '内容、padding、border、margin 构成元素占用空间。', 'Computed 的盒模型图；box-sizing 是否为 border-box。'],
          ['Flex', '沿一个主轴安排一组子项。', '导航按钮的换行、收缩、间距。'],
          ['Grid', '用行列轨道组织二维内容。', '周历列数、卡片宽度和容器大小。'],
          ['position / z-index', '定位与叠放关系，受包含块和层叠上下文影响。', '弹窗、吸顶头和按钮是否被其它元素挡住。'],
          ['媒体查询', '根据视口等条件覆盖规则。', '≤860px 应切为单日议程，并取消桌面吸顶规则。']
        ]) + '<p>当文本超出卡片，要区分数据过长、容器宽度、最小尺寸、white-space 和 overflow。看到滚动条只能证明发生溢出，不能直接推断应该删掉内容。排期坐标仍应由 lib/calendar.js 计算，CSS 负责展示。</p>' },
        { title: '4. 一次具体的界面排查', html: '<ol><li>在隔离本地站点打开查询页，输入一个番名，用检查元素选中结果卡。</li><li>在 Elements 看按钮、封面和标题的父子关系；在 Styles 取消一个 padding，观察变化。</li><li>在 Computed 找实际宽度与颜色，跳回对应的 CSS 文件。刷新页面，确认临时修改消失。</li><li>切到 390px 视口与桌面视口，测试查询、详情、逐集按钮和关闭后的焦点。</li><li>用 Tab/Shift-Tab 移动，用 Enter 或空格操作按钮，Escape 关闭原生 dialog。</li></ol><p>开发者工具里的临时编辑通常不保存到仓库。这适合验证假设；确认后再回到源码做最小修改。程序能构建不代表交互和手机布局正确，视觉与键盘检查是不同证据。</p>' }
      ],
      quiz: { question: '浏览器 Styles 面板改好了间距，刷新又恢复，应该怎样理解？', options: ['React 把数据库里的 CSS 回滚了', '修改只作用于当前页面，应把已验证改动写入正确的样式源文件', '必须清空账号 Cookie'], answer: 1, explanation: '开发者工具通常修改当前 DOM 或样式表的内存状态；它不会自动更新仓库文件。先定位实际生效的源规则，再做最小源码修改并验证两种视口。' },
      task: '<h3>给一张节目卡画结构图</h3><p>在隔离站点检查一张卡，画出详情按钮与独立已看按钮，指出各自的 aria 标签。找到控制它们尺寸的一条样式，临时调整并刷新复原。</p><p><strong>验收：</strong>能说明结构、样式、行为分别由哪部分负责；用键盘打开和关闭详情后，焦点回到触发卡片；能找到 ≤860px 的响应式入口。</p>',
      resources: [{ title: 'MDN：CSS 盒模型', url: 'https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics/Box_model' }, { title: 'MDN：HTML button', url: 'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button' }]
    }
  ];
  const byId = new Map([...window.TEACH.lessons, ...additions].map(lesson => [lesson.id, lesson]));
  window.TEACH.lessons = ['web', 'node', 'language', 'async', 'markup', 'react', 'calendar', 'backend', 'data', 'debug', 'maintenance'].map(id => byId.get(id));
})();
