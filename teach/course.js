(() => {
  const src = (path, start, end, notes='') => `<div data-snippet="${path}" data-start="${start}" data-end="${end}">${notes}</div>`;
  const link = (path, start=1, end=start, label=path) => `<button class="source-link" data-source="${path}" data-start="${start}" data-end="${end}">${label}</button>`;
  const pre = (code) => '<pre><code>'+code.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')+'</code></pre>';
  const table = (heads,rows) => '<div class="table-wrap"><table><thead><tr>'+heads.map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  const lessons = [
    {
      id:'language',nav:'语法：换一套熟悉的记号',title:'把陌生语法翻译成熟悉的语言',subtitle:'从 Python 推导式，走到 JS 数据变换',time:'35–45 分钟',tags:['对象与数组','map / filter','模块与类型'],
      lead:'你会循环、函数、集合和结构体。读这个项目，先建立语法对照，再追踪输入与输出。无需从头背一遍 JavaScript。',
      sections:[
        {title:'1. 文件后缀，先只认这五种',html:table(['文件','可以怎样理解','项目里的例子'],[
          ['.js','JavaScript 代码；可在浏览器或 Node 中运行，但可用 API 取决于环境。','lib/calendar.js'],
          ['.ts','加了静态类型标注的 JavaScript；由工具处理。','app/auth.ts'],
          ['.tsx','TypeScript + 描述界面的 JSX 语法。','app/page.tsx'],
          ['.css','选择元素并声明颜色、位置、大小等样式规则。','app/globals.css'],
          ['.mjs','明确作为 ES 模块运行的 JavaScript。','tests/calendar.test.mjs']
        ])+'<p>HTML 是结构，CSS 是样式，JavaScript 是行为，TypeScript 是开发时的类型检查。这不是四个互相替代的语言选项，而是网站的不同职责。</p>'},
        {title:'2. 把常见记号换成你的母语',html:table(['JavaScript','C++ / Python 的联系','容易踩的坑'],[
          ['<code>const a = { id: "a", count: 12 }</code>','像结构体 / dict；用 a.id 取字段。','const 固定绑定，不冻结对象。a.count 仍能被改。'],
          ['<code>const { id, count } = a</code>','提取两个成员，叫解构。','变量名与字段名对应。'],
          ['<code>records.map(r =&gt; r.id)</code>','Python: [r["id"] for r in records]','返回新数组；箭头函数类似 lambda。'],
          ['<code>records.filter(r =&gt; r.count &gt; 12)</code>','列表推导式后面的 if 条件。','保留的是原对象的引用，不是深拷贝。'],
          ['<code>values.reduce((s, x) =&gt; s + x, 0)</code>','从 s=0 开始逐项累加。','末尾的 0 是初始值。'],
          ['<code>new Set(ids)</code> / <code>new Map(pairs)</code>','集合 / 键值映射；查重与按 ID 查找。','Map 键与普通对象属性并不完全相同。'],
          ['<code>[...old, value]</code> / <code>{ ...record, time }</code>','浅拷贝后追加 / 用新字段覆盖。','嵌套对象仍共享引用；后写的字段覆盖前写的。'],
          ['<code>a?.id</code> / <code>a ?? fallback</code>','a 缺失时安全读取 / 缺失时取默认值。','?? 只处理 null、undefined；|| 还会替换 0、空串和 false。']
        ])+pre('const ids = ["a", "b", "a"];\nconst unique = [...new Set(ids)]; // ["a", "b"]\nconst next = unique.filter(id => id !== "a"); // ["b"]\n// unique 仍是 ["a", "b"]')+'<div class="callout amber"><strong>对象的 === 比较引用身份。</strong><p><code>{id: "a"} === {id: "a"}</code> 是 false。业务身份应比较稳定的 id；不要把两个字段一样的对象误判成同一个对象。</p></div>'},
        {title:'3. 第一段真实源码：搜索只是一个谓词',html:'<p>给作品 r 与查询 q，判断中日文标题中是否<strong>存在</strong>一个包含查询词。这就是你熟悉的布尔函数。</p>'+src('lib/anime-search.js',1,10,'<p><strong>第 2 行：</strong>NFKC 统一兼容字符形态（如全角英文），再转小写、去空白。标题和查询必须用同一个标准化函数。</p><p><strong>第 5 行：</strong>export 让其它文件能够 import；对象解构取出中日文标题。</p><p><strong>第 7 行：</strong>空查询在算法层不做筛选。页面另用 hasAnimeQuery 显示“请输入”提示。</p><p><strong>第 9 行：</strong>some 是存在量词 ∃，includes 是子串关系；这不是拼写纠错或语义搜索。</p>')+'<div class="math-output">match(r, q) = ∃ t ∈ titles(r), N(q) ⊆ N(t)</div><p class="subtle">这里的 ⊆ 仅作为“子串包含”的教学记号，不是字符串的集合化实现。</p><div data-widget="search"></div>'},
        {title:'4. import、类型与运行时，各管什么',html:pre('import { eventsForWeek } from "../lib/calendar.js";\n// 命名导入：名称对应那个文件 export 的函数\n\ntype Page = "all" | "mine" | "stats" | "search";\n// 有限取值集合；不是类，也不会生成这四个网页\n\nconst [query, setQuery] = useState<string>("");\n// <string> 是泛型类型参数；此处不是 HTML 标签')+'<p><code>import</code> 连接文件依赖，类似引入另一个 Python 模块；不要把它当作 C++ 预处理器逐字粘贴。<code>@/</code> 是 tsconfig 中的路径别名，映射到项目根目录。</p><p><code>unknown</code> 表示“还不知道是什么”；<code>string | null</code> 表示字符串或空值。<code>as Anime[]</code> 是你向类型检查器作断言，运行时不会逐项检查外部 JSON。网络输入仍须通过 <code>typeof</code>、<code>Array.isArray</code> 和业务校验。</p><p><code>null</code> 常被项目用作“尚未加载”；<code>[]</code> 表示“加载成功，确实为空”。这两种状态会显示不同界面，不能随便合并。</p>'},
        {title:'5. 先预测再运行：异步代码的执行顺序',html:'<p>Python/C++ 的顺序程序里，下一行通常等待上一行结束；网页还要在等待网络时响应输入。Promise 表示将来完成的结果，async 函数总会返回 Promise，await 只暂停当前异步函数后半段。它不意味着自动开一个线程替你做所有计算；长时间 CPU 循环依然会占住当前 JavaScript 执行线程。</p>'+pre('node --input-type=module - <<\'JS\'\nasync function inspect() {\n  console.log("B");\n  await Promise.resolve();\n  console.log("D");\n}\nconsole.log("A");\nconst pending = inspect();\nconsole.log("C");\nawait pending;\nJS')+'<p><strong>预期：</strong>A、B、C、D。调用 inspect 时先运行到 await，调用者继续输出 C，等待后的部分稍后输出 D。若网络请求被拒绝，await 会在这里抛错；try/catch 捕获它，finally 用来解除 loading 等状态。</p><p>这也解释一个常见维护错误：在 try 里调用异步函数却没有 await，后续 rejection 不一定由这个 catch 捕获。先找到 Promise 的等待者，再判断错误交给谁处理。</p>'}
      ],
      quiz:{question:'const next = [...old]; next[0].seen = true 会不会改变 old[0].seen？',options:['不会，展开语法会递归复制全部内容','会，两个数组里的第一个对象仍是同一个引用','一定报错，因为 next 是 const'],answer:1,explanation:'展开只复制数组这一层；嵌套对象仍然共享。const 也不会冻结对象。需要改对象字段时，用 map 并为改动的那项创建新对象。'},
      task:'<h3>从十行代码找到它在页面中的用途</h3><p>在项目根目录执行：</p>'+pre('rg -n "matchesAnimeTitle|searchResults|hasAnimeQuery" app/components/search-page.tsx lib/anime-search.js\nnode --test tests/anime-search.test.mjs')+'<p><strong>验收：</strong>测试通过；你能指出输入、返回类型，以及页面搜索为什么不受当前季度限制。</p><details><summary>参考答案</summary><p>输入是作品对象和查询字符串，返回 boolean。页面用 allAnime.filter 调用它；当前季度不是这个筛选的输入。</p></details>'
    },
    {
      id:'web',nav:'网站：代码分别在哪里跑',title:'一个网站，是几个程序在合作',subtitle:'浏览器、服务器、数据库与 HTTP',time:'35–45 分钟',tags:['执行环境','HTTP / JSON','HTML 与 CSS'],
      lead:'竞赛程序常是“读输入 → 算答案 → 退出”。网站则长期等待事件，而且浏览器与服务器有各自的内存。先画清执行边界。',
      sections:[
        {title:'1. 同一个仓库，不等于同一个运行环境',html:table(['所在位置','负责什么','不能怎样想'],[
          ['浏览器','显示 DOM、执行事件、保存 React 状态、发起 fetch。','浏览器不能直接读取服务器上的 SQLite 文件。'],
          ['Node.js 服务进程','运行 Next.js，接收页面/API 请求，认证用户并访问 SQLite、头像文件。','进程重启会失去普通内存变量；需要持久保存的账号数据必须写入存储。'],
          ['服务器磁盘','DATA_DIR 中的 SQLite 保存表记录，avatars 子目录保存私有文件。','它不会随 Git push 自动上传，也不与 Mac 的数据库自动同步。'],
          ['本地 Node 工具','导入资料、执行测试、构建应用。','scripts/ 的导入脚本不会因用户刷新页面而自动运行。']
        ])+'<p>你可以把 HTTP 理解为“跨进程传参”，把 JSON 理解为可传输的字符串格式。但它不是普通函数调用：有延迟、可能断线、需要验证身份与输入。</p>'},
        {title:'2. 打开页面时，真正发生了什么',html:'<div class="flow"><div class="flow-node">GET /<small>浏览器请求页面</small></div><span class="flow-arrow">→</span><div class="flow-node">Caddy → Next.js<small>HTTPS 入口与 Node 服务</small></div><span class="flow-arrow">→</span><div class="flow-node">HTML + CSS + JS<small>浏览器接收资源</small></div><span class="flow-arrow">→</span><div class="flow-node">React 接管交互<small>事件、状态、后续 API</small></div></div><p>React 是界面库；Next.js 是应用框架，负责 app 目录路由、服务端页面输出和构建；Node.js 是在服务器运行 JavaScript 的执行环境。生产时 Caddy 接收外部 HTTPS，请求被转给一个 Next.js 进程。本地开发则直接访问终端显示的 Next 地址。</p><p><code>app/page.tsx</code> 对应首页，<code>app/api/auth/me/route.ts</code> 对应身份 API；这些是框架约定，不是文件会自行监听网络。<code>"use client"</code> 标记客户端组件边界，它的首屏仍可由服务器生成 HTML。浏览器加载 JS 后将事件与已有 HTML 接起来，称为 hydration。不要在组件首次渲染中直接读取只存在于浏览器的 window。</p>'+src('app/layout.tsx',1,29,'<p>layout 包住所有页面；metadata 管标题与图标，首屏脚本先决定主题。你看到的网页不是一个文件，而是 HTML、样式和脚本协作的结果。</p>')},
        {title:'3. 一个按钮怎样从描述变成屏幕上的东西',html:pre('// 示意 JSX，不是摘录\n<button className="next-week" onClick={() => changeWeek(7)}>\n  下一周\n</button>\n\n/* 示意 CSS */\n.next-week { color: var(--accent); }')+'<p>JSX 的标签描述结构；<code>className</code> 选择样式；<code>onClick</code> 提供事件函数。<code>{…}</code> 把 JavaScript 表达式嵌入界面。<code>onClick={changeWeek(7)}</code> 会在渲染时直接调用函数，与传入一个等待点击的函数不同。</p><p>DOM 是浏览器维护的元素树。CSS 选择器匹配树中的元素，层叠规则决定最终样式。调样式先在开发者工具 Elements / Computed 看实际生效的规则，再找它所在文件。</p><p>本项目的颜色来自 CSS token，两套主题同名覆盖；手机在 <code>860px</code> 及以下使用单日议程。一个卡片“看不见”可能是显示规则、遮挡或错误位置，不一定是数据丢了。</p>'},
        {title:'4. Network 面板是跨进程调用日志',html:table(['请求字段','你要回答的问题','真实例子'],[
          ['URL + Method','调用哪一个服务器入口？','PUT /api/anime-selections'],
          ['Request payload','发了什么参数？','{"animeIds":["稳定ID"]}'],
          ['Cookie','浏览器是否携带了会话？','ac_session；HttpOnly 阻止 JS 读，不阻止浏览器发送。'],
          ['Status','服务端如何处理？','200 成功；400 输入不合规；401 未认证；500 服务器失败。'],
          ['Response','服务器返回了什么？','JSON 成功结果或 error。']
        ])+'<p>状态码解释以具体接口为准。“请求成功发出”不等于“业务成功保存”。<code>fetch</code> 收到 400 或 500 通常仍然正常返回 Response，需要检查 <code>response.ok</code>。只有断网等请求失败才会直接 reject。<a href="https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch" target="_blank" rel="noreferrer">依据：MDN fetch</a>。</p>'+pre('const response = await fetch("/api/auth/me");\nif (!response.ok) {\n  // 这里区分 401 与服务器失败，而不是把所有失败都叫断网\n}\nconst data = await response.json();')+'<p><code>async</code> 函数返回 Promise。<code>await</code> 暂停当前异步函数的后续步骤，浏览器仍能处理其他事件；它不会把整个网站锁死。<code>try/catch/finally</code> 分别处理正常路径、异常路径与收尾。</p>'},
        {title:'5. 做一份可以复核的请求记录',html:'<p>先按 <a href="#node">下一课的隔离启动步骤</a> 运行项目，再打开开发者工具 Network，开启 Preserve log，清空记录，再刷新。先筛选 Doc 看首页，接着筛选 JS/CSS 看资源，最后用 Fetch/XHR 看 API。它们属于同一次使用过程，但不是同一个请求，也不一定由同一个错误造成。</p>'+pre('curl -i http://127.0.0.1:3000/api/health\ncurl -i http://127.0.0.1:3000/api/auth/me')+'<p>这里使用下一课固定的 3000 端口；如果主动改为其它端口，两条 curl 的地址也要同步改。健康接口正常应返回 200；第二条 curl 没有携带浏览器的 Cookie，应返回 401，即使浏览器已登录也一样。curl 是另一个 HTTP 客户端，浏览器登录状态不会自动共享给它。</p><p>在浏览器里登录一个本地练习账号，比较 /api/auth/me 的状态码与请求 Cookie 是否存在，再观察一次收藏 PUT 的 Payload 和响应。记录 URL、方法、状态码、响应类型与耗时即可；记录中不抄写实际 Cookie 或密码。</p><p><strong>验收：</strong>解释“首页 200、身份 401”为什么可以同时出现；说明接口返回 JSON 与浏览器下载 HTML 的区别；在下一周与查询操作中观察有没有相应业务网络请求。</p>'}
      ],
      quiz:{question:'Network 中 /api/auth/me 返回 401，说明了什么？',options:['React 一定没有成功渲染','服务器没有认可当前请求的会话；未登录时这是预期结果','网络一定断开了'],answer:1,explanation:'401 表示接口要求的身份认证没有通过。请求已经得到服务器响应；接着检查是否登录、是否发送 Cookie、会话是否有效。'},
      task:'<h3>观察一次真实页面加载</h3><p>先完成 <a href="#node">下一课：Node 与隔离开发环境</a> 的启动步骤，再回到本课观察。打开已经核对端口和临时 DATA_DIR 的练习实例。Mac 浏览器可用 ⌥⌘I 打开开发者工具，选 Network，刷新后筛选 <code>/api/</code>。</p><p><strong>验收：</strong>记录 /api/auth/me 的方法与状态；指出 HTML、脚本文件、API JSON 的区别。未登录出现 401 不需要“修掉”。本课先建立模型；第一次的实际操作在下一课完成隔离启动后进行。</p><details><summary>进一步判断</summary><p>页面筛选静态目录不需要搜索 API。收藏和已看需要 API。身份加载与部分 effect 可能重叠执行，不要把所有请求当作严格串行。</p></details>',
      resources:[{title:'MDN：fetch 的返回值与失败条件',url:'https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch'}]
    },
    {
      id:'react',nav:'React：界面是状态的函数',title:'点击以后，页面为什么会变？',subtitle:'用状态转移理解 React，而不是背 Hook',time:'40–50 分钟',tags:['state','effect','URL 与渲染'],
      lead:'把界面写成 V = render(D, S, E)。React 调用组件函数得到界面描述；一次动作更新状态，再计算下一帧。',
      sections:[
        {title:'1. 组件不是只跑一次的 main()',html:src('app/page.tsx',15,25,'<p>每一对变量和 setter 是一个状态槽位。CalendarApp 保存当前页面、查询词与周历位置，个人数据由 ViewerProvider 统一保存。setter 请求一次后续渲染，不会立刻改掉当前函数里的旧变量。</p>')+'<p>state 像“这一轮渲染的快照”：事件函数看到的是创建它时那轮的值。依赖上一次状态计算下一次时，函数式更新 <code>setCount(n =&gt; n + 1)</code> 会处理更新队列。参见 <a href="https://react.dev/learn/state-as-a-snapshot" target="_blank" rel="noreferrer">React：State as a Snapshot</a>。</p><div data-widget="state"></div>'},
        {title:'2. 算得出来的东西，先别再存一份',html:src('app/components/search-page.tsx',11,18,'<p>searchResults 由 allAnime 与 animeQuery 计算，搜索进度由结果与已看记录计算。当前 SearchPage 用 useMemo 缓存这些派生值；缓存依赖变化时重算，它们仍不是独立的 state 或数据库记录。</p>')+'<p>这与数学里减少自由变量相同：如果 <code>results = filter(allAnime, query)</code>，再额外存 results 就增加了“query 改了但 results 没同步”的可能。useMemo 可以减少重复计算，但不能代替正确的依赖关系；先写出纯计算，再决定是否需要缓存。</p><p>React 中 <code>key</code> 用于识别列表中的同一项。项目用番剧 ID 和集数标识事件；重排列表时使用数组下标可能把一个项目的局部状态对应到另一个项目。</p>'},
        {title:'3. 四种工具，按职责区分',html:table(['工具','直观解释','本项目用途'],[
          ['useState','影响当前界面的记忆。','当前页面、周起点、查询词、已看列表。'],
          ['useRef','跨渲染保留一个盒子；改 .current 不直接重渲染。','dialog DOM 节点；是否已经定位初始周。'],
          ['useEffect','界面提交后，与外部系统建立或更新联系。','读 API、监听 popstate、协调 dialog。'],
          ['useSyncExternalStore','订阅 React 之外的数据源并读取快照。','北京时间、主题属性。']
        ])+'<p>Hook 按稳定的调用顺序工作，所以放在组件顶层，不放在条件分支或循环里。effect 的依赖数组描述它使用的反应式值；<code>[]</code> 不能理解为“整个程序永远只执行一次”。订阅需要 cleanup；开发模式的额外执行会帮助暴露清理问题。<a href="https://react.dev/learn/synchronizing-with-effects" target="_blank" rel="noreferrer">依据：React Effects</a>。</p>'+src('app/page.tsx',33,41,'<p>定义 syncPageFromUrl → 立即读一次 URL → 监听后退前进 → cleanup 移除同一个监听函数。[] 在此表示没有使用变化的组件值。</p>')},
        {title:'4. 顺着一次搜索读代码',html:src('app/page.tsx',43,54,'<p><strong>changePage：</strong>先维护 URL 中的 page，再维护 React 的 activePage。pushState 本身不会让 React 重新渲染。</p><p><strong>submitPageSearch：</strong>接收 PageHeading 已取出的查询字符串 → 设置查询词 → 切换页面。表单事件位于页面标题组件，结果计算位于 SearchPage，读调用链时不要只搜索一个文件。</p>')+'<p>读代码时画四个箭头：<code>表单 → setAnimeQuery → searchResults → 结果 JSX</code>。当前 URL 保存页面类型，<strong>搜索词只在 state</strong>。所以浏览器前进后退能切页面，不代表每条历史都保存了搜索词，刷新也不保证恢复词。</p><p>初次显示时，页面还会通过 effect 定位当前放送周。<code>didSetInitialWeek</code> 防止时钟每分钟更新时把用户正在查看的历史周强行拉回今天。</p>'},
        {title:'5. 维护 React 时的三个定位问题',html:'<ol><li><strong>动作有没有进入处理函数？</strong>检查按钮 disabled、事件冒泡、表单 preventDefault。</li><li><strong>state 有没有得到下一版值？</strong>检查是否调用 setter，是否意外原地修改数组，是否使用了过期值。</li><li><strong>渲染有没有消费这个 state？</strong>检查筛选条件、空值分支、class 与 CSS，而不是无限加 effect。</li></ol>'},
        {title:'6. 组件拆分后，数据怎样传到按钮',html:src('app/page.tsx',68,86,'<p>CalendarApp 把 location 与 onLocationChange 作为 props 交给 CalendarPage。props 就是函数输入，其中也可以包含函数；子组件要请求改变父状态，就调用这个回调，而不是直接改 location 对象。</p>')+'<p>ViewerProvider 包住所有页面，useViewer 读取同一份账号与个人状态。Context 在这里避免把同一组参数穿过每层组件；它不是服务器数据库，也不会自动持久化。Provider 被卸载后，里面的普通 React 状态会消失。</p>'+src('app/hooks/use-viewer.tsx',251,260,'<p>Provider 实际只调用一次 useViewerState 来持有共享状态；useViewer 取得它。不要在每个卡片独立调用 useViewerState，否则每张卡会拥有不同的列表和请求。</p>')+'<p>练习顺着“下一周”读：按钮 → CalendarPage.changeWeek → onLocationChange → CalendarApp.setCalendarLocation → 新 props → eventsForWeek → CalendarSchedule。'+link('app/components/calendar-page.tsx',24,36,'查看派生事件')+'与'+link('app/components/calendar-page.tsx',55,64,'查看导航回调')+'是中间的两站。指出为什么切到统计再回来能保留周历位置：state 在仍存活的父组件里。</p>'}
      ],
      quiz:{question:'结果能由 allAnime 和 animeQuery 完全计算，最先采用什么方案？',options:['再建一个 results state，用 effect 同步','直接在渲染时调用筛选函数；测量后才考虑缓存','把全部结果写入 localStorage'],answer:1,explanation:'派生值直接计算可以减少不同步状态。当前项目的 useMemo 缓存这个计算结果，但结果仍只有目录和查询这两个来源，不增加一份需要同步的 state。'},
      task:'<h3>不用运行，先画出搜索的依赖图</h3><p>在源码查看器中分别找到 <code>useState("")</code>、<code>submitPageSearch</code>、<code>searchResults</code>、结果页 JSX。用四个方框连线，再用 Network 验证搜索有没有发出搜索 API 请求。</p><p><strong>验收：</strong>能解释“输入变化、URL 变化、网络请求”为什么是三件不同的事；能说出刷新后哪个状态会消失。</p>',
      resources:[{title:'React：状态是一张快照',url:'https://react.dev/learn/state-as-a-snapshot'},{title:'React：与外部系统同步的 Effects',url:'https://react.dev/learn/synchronizing-with-effects'}]
    },
    {
      id:'calendar',nav:'排期：你擅长的算法部分',title:'从日期与集合，推导一张日历',subtitle:'分段映射、等差数列与区间分配',time:'45–60 分钟',tags:['放送日映射','逐集展开','区间贪心'],
      lead:'这是与你现有能力最接近的一课。排期函数处理数据，页面把计算结果变成坐标。不要在 JSX 里重新实现日期算法。',
      sections:[
        {title:'1. 先区分三个概念',html:table(['概念','例子','用途'],[
          ['真实播出日期与北京时间','2026-08-01 02:15','详情和原始播出事实。'],
          ['周历显示日与轴内时刻','2026-07-31，26:15','放在前一天栏目的“次日 02:15”。'],
          ['自然日统计','2026-08-01','按真实日期统计今日播出；不能一概改成显示日。']
        ])+'<p>“凌晨算前一天”是业务显示约定，不是时区减了一天。时间先被数据来源确定为北京时间，然后再做显示坐标变换。没有明确分钟时刻的网络首播保持 null，不能填 00:00 假装完整。</p>'+src('lib/calendar.js',129,142,'<p>00:00 ≤ t &lt; 05:00 时，显示日减一、分钟数加 1440。broadcastDate / broadcastTime 保留真实信息。05:00 正好不进入分支，这是必须测试的边界。</p>')+'<div data-widget="midnight"></div>'},
        {title:'2. 一部作品，怎样展开成逐集事件',html:'<p><code>eventsForWeek(records, weekStart)</code> 先造出七天的 Set。对每部作品展开各集真实日期，经过放送日映射，再判断显示日是否落在这七天中。日期加减用 UTC 辅助运算，避免运行电脑的本地时区改变纯日期结果。</p>'+src('lib/calendar.js',245,280,'<p>有 episodeSchedules 的条目先走明确分段排期。常规分支：首播 P 集，后续周播的第 e 集日期为 regularStart + 7 × (e − P − 1) 天。</p>')+'<div class="callout"><strong>举例：6 月 20 日网络先行 1–3 集，7 月 4 日开始每周播。</strong><p>先行日单独显示 1–3 集且不虚构时刻；7 月 4 日是第 4 集，7 月 11 日第 5 集。先行部分走 dateOnlyEventsForWeek，后续有时刻的部分走 eventsForWeek。</p></div><p>季度选择器只是定位周；当前 <code>changeSeason</code> 调用 <code>firstFullWeekStart</code>，并不总是直接使用原始 firstWeekStart。周历仍能跨季度，不能为了“修越界”把数据裁成某一个季度。</p>'},
        {title:'3. 同时播出的卡片，是区间分配问题',html:'<p>将每张卡片看作半开区间 <code>[start, start + 30)</code>。这里的 30 分钟是视觉占位，不是声明每集实际播放 30 分钟。按开始时刻排序，在每个重叠簇内找第一个已空闲的栏；没有空栏就创建新栏。</p>'+src('lib/calendar.js',202,218,'<p>laneEnds[k] 是第 k 栏的结束时刻。end ≤ start 就能复用。完成一整个簇后才知道 laneCount，所以再 map 一次填上统一栏数。</p>')+'<p>你可以用反证法解释新开栏的必要性：那一刻旧栏都尚未结束，所有旧卡片与新卡片同时重叠。实现用线性扫描寻找空栏，最坏可到 O(n²)；先理解正确性，只有测得性能瓶颈再考虑堆。</p><div data-widget="lanes"></div>'},
        {title:'4. 分钟，如何变成像素',html:src('app/components/calendar-cards.tsx',32,38,'<p>top = (节目分钟 − 时间轴起点) × 1.6 px；left = lane / laneCount × 100%；width = 1 / laneCount × 100%。CSS 读取这些变量来定位桌面卡片。</p>')+'<p>实际页面将默认轴范围传为 05:00–次日 05:00，再按当周事件裁切；不要只看 lib 中的默认常量就推断页面范围。最早事件向下取整到小时，最晚加卡片占位后向上取整，并受传入范围约束。</p><p>手机不使用同一套绝对定位，而使用同一批事件的分组议程。修公共排期函数后，还要检查桌面、手机、当前时间标线和日期高光这些不同消费者。</p>'}
      ],
      quiz:{question:'8 月 1 日 04:59 与 05:00，在周历中分别属于哪一天？',options:['都在 7 月 31 日','04:59 在 7 月 31 日；05:00 在 8 月 1 日','都在 8 月 1 日'],answer:1,explanation:'阈值是半开区间 [00:00, 05:00)。显示日期变换不改变真实播出日期。'},
      task:'<h3>用边界反例验证你的理解</h3>'+pre('node --test tests/calendar.test.mjs\nnode --input-type=module -e \'import { calendarDateForDateTime } from "./lib/calendar.js"; console.log(calendarDateForDateTime("2026-08-01", "05:00"));\'')+'<p><strong>验收：</strong>输出 2026-08-01；能预测 00:00 与 04:59 的输出。接着进入 <a href="#lab">Bug 实验室</a>修复一个故意写错的边界副本。真实 lib/calendar.js 不需要为这道练习修改。</p>'
    },
    {
      id:'backend',nav:'保存：从一次点击到数据库',title:'“已追番”为什么刷新后还在？',subtitle:'追踪一次保存，理解认证与失败回滚',time:'45–60 分钟',tags:['PUT / GET','会话身份','原子性与回滚'],
      lead:'页面变了，只能证明浏览器状态变了。跨设备、刷新后仍然存在，需要服务器认可身份并把记录存入数据库。',
      sections:[
        {title:'1. 先看完整的保存路径',html:'<div data-widget="request"></div><p>收藏提交的是<strong>完整下一版集合</strong>。API 语义可写成 <code>S_user ← unique(payload) ∩ validIds</code>。只提交本次新增一个 ID，会按现有语义把其他收藏替换掉。</p>'+src('app/hooks/use-viewer.tsx',177,205,'<p>先计算下一版数组并显示；PUT 失败时恢复之前列表；finally 解除保存锁。这叫乐观更新。它让操作更快，但要有明确的失败路径。</p>')},
        {title:'2. API 是服务器函数，入口先设边界',html:src('app/api/anime-selections/route.ts',23,46,'<p>从上往下读四层：检查请求来源 → 用会话确定账号 → 解析并筛选 ID → 在事务中替换该账号集合。浏览器发送的 email 不能成为写入身份，网页按钮禁用也不能替代服务器校验。</p>')+'<p>事务把一组数据库操作组成一个不可分割的状态转移。删除旧列表后若第二批插入失败，原列表应恢复；否则用户只会看到收藏被清空。当前代码使用 <code>db.transaction((tx) =&gt; { ... })</code>，这是 better-sqlite3 的同步事务，内部每条 Drizzle 语句都必须调用 <code>.run()</code>、<code>.get()</code> 或 <code>.all()</code> 执行。</p><p>不要把回调写成 async，也不要在里面 await：异步函数返回 Promise 时，数据库事务的同步边界已经结束。网络调用、密码哈希和文件上传先在事务外完成，再用短事务提交数据库结果。</p><p>收藏仍按 50 条分批，51 部分为 50 + 1，所有批次与删除同属一笔事务。这是当前项目保留的批量约定，不能把它误写为 SQLite 只有 100 个参数的通用限制。<a href="https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md" target="_blank" rel="noreferrer">better-sqlite3 官方事务说明</a>。</p>'},
        {title:'3. “你是谁”不能让浏览器自己宣布',html:src('app/auth.ts',19,35,'<p>读取随机会话令牌 → 计算 SHA-256 → 查会话与用户 → 判断过期时间。查不到时返回 null，接口再决定响应 401。</p>')+'<p>登录时服务器验证密码，签发随机 Cookie。浏览器随后在同源请求里自动携带它。数据库存会话令牌的哈希；密码另用 PBKDF2 派生哈希。哈希不是可逆加密，这两类哈希也不能混着替换。</p><p>Cookie 的 <code>HttpOnly</code> 阻止页面 JS 读取令牌；<code>SameSite=Lax</code> 限制部分跨站发送；<code>Path=/</code> 规定路径；生产 <code>Secure</code> 由可信 APP_ORIGIN 的 HTTPS 配置决定，不能信任浏览器可伪造的转发头。本地 HTTP 的登录问题应逐段查看 Set-Cookie 与后续请求，不能直接删认证逻辑。</p><div class="callout amber"><strong>公开网页与私有账号数据有不同边界。</strong><p>任何人可以查看公共番剧目录，个人追番、已看与头像则要求 ac_session。登录成功只说明拿到了会话；每个个人接口仍要重新校验它。当前没有邮件验证和邮件找回密码功能，邮箱是登录名，不能向用户承诺现有代码没有提供的账号服务。</p></div>'},
        {title:'4. 已看状态更细：一张卡片可以对应多条记录',html:src('lib/anime-episode-views.js',1,16,'<p>范围 1–3 展开为 1-1、2-2、3-3 三个单集。界面可以合并展示，但持久状态必须能逐集开关。</p>')+'<p>当前接口是 <code>PUT /api/anime-episode-views</code>，请求体如下，最多 25 项。注意它不是 POST，也不再是只支持单条更新的接口。</p>'+pre('{\n  "watchedEpisodes": [\n    { "animeId": "demo", "episodeStart": 1, "episode": 1 },\n    { "animeId": "demo", "episodeStart": 2, "episode": 2 }\n  ],\n  "watched": true\n}')+'<p>服务器会拒绝未知 ID、越界集数、非整数、空批次、超过 25 项，且每项必须为规范单集。这个 demo 只是结构示意，不是可向真实 API 提交的已收录 ID。</p><p>不同集数可能同时保存：第 1 集请求失败，第 2 集成功时，回滚应只撤销第 1 集的那次变化，保留第 2 集。当前 restoreEpisodeViews 从请求前快照恢复目标单集，保留其他单集的最新状态。它能保留连播卡片原有的部分已看，不能简单地把整张卡的布尔值翻转，也不能用整个旧数组覆盖。</p>'+src('tests/anime-episode-views.test.mjs',82,98,'<p>阅读测试像阅读命题：准备已看集合 → 撤销失败的更新 → 断言并发成功的另一集仍存在。测试保护的是行为，不是某一行语法。</p>')},
        {title:'5. 按接口查，而不是猜所有写入都是 POST',html:table(['入口','方法','语义'],[
          ['/api/auth/login、register','POST','登录 / 注册并签发会话。'],
          ['/api/auth/me','GET','读取身份；未登录 401。'],
          ['/api/auth/logout、change-password','POST','退出 / 改密码；改密码撤销该账号全部会话。'],
          ['/api/anime-selections','GET / PUT','读完整收藏 / 原子替换完整收藏。'],
          ['/api/anime-episode-views','GET / PUT','读已看并迁移合法旧范围 / 批量改变单集已看状态。'],
          ['/api/auth/avatar','GET / PUT / DELETE','经过认证读取 / 上传 WebP / 删除头像。']
        ])+'<p class="subtle">GET 已看接口包含历史数据修复逻辑，是当前项目的特殊行为。不要据此推导“所有 GET 都应该写数据库”。</p>'},
        {title:'6. 登录之外，还有来源、缓存和并发边界',html:src('lib/server/http.js',25,37,'<p>Origin 是协议、主机、端口三者构成的来源。生产写入要求它与 APP_ORIGIN 精确匹配；JSON 解析还检查 Content-Type 与体积。通过认证不代表任意来源、任意大小的数据都应该被接收。</p>')+'<p>Cookie 会由浏览器自动发送，所以接口还要防止别的网站诱导用户发起写请求。生产日志里若出现 403，先核对域名、协议、Origin 与 APP_ORIGIN，而不是删除 requireSameOrigin。401 说明身份失败，403 可能是来源被拒绝，413 是请求太大，415 是内容类型不符，429 表示触发频率限制，应读取 Retry-After。</p><p>公开番剧资源可以缓存，个人 JSON 则用 private, no-store，避免把账号数据当成共享静态资源。对显示用户输入的组件，应让 React 按普通文本输出，不把未经处理的内容放进 dangerouslySetInnerHTML；这与防止 SQL 拼接一样，都是把数据与可执行结构分开。</p>'+src('app/hooks/use-viewer.tsx',48,62,'<p>账号切换会递增 sessionVersion 并清空旧个人数据。每个未完成请求保存开始时的版本，只在版本仍一致时写 state。AbortController 能中止客户端等待，但不等于服务器已经撤销写入。</p>')+'<p>做时序题：A 账号 GET 很慢 → 退出并登录 B → A 的结果才回来。没有版本检查就会把 A 数据写进 B 界面。另一个时序是“第 1 集失败、第 2 集成功”，这需要按目标单集恢复。两种问题分别需要账号隔离与细粒度回滚，不能用一个整数组备份解决。</p>'+src('app/hooks/library-state.js',1,13,'<p>对本次请求涉及的每集，恢复它在 previous 中的布尔状态；current 中其它集不动。试用原先只看过 1–3 中第 2 集的反例，判断为什么只做 watched 的逻辑取反不够。</p>')+'<p><strong>验收：</strong>写出两种时序各自应保留和丢弃的结果，再运行 <code>node --test tests/auth-client-flow.test.mjs</code>；测试通过后仍需在浏览器观察自己的操作路径。</p>'}
      ],
      quiz:{question:'第 1 集保存失败，第 2 集在此期间成功。回滚时应怎么做？',options:['恢复点击第 1 集之前的整个旧数组','只逆转失败的第 1 集操作，保留当前第 2 集状态','清空已看列表，再让用户重选'],answer:1,explanation:'整份旧快照可能抹掉并发成功的更新。当前 restoreEpisodeViews 逐个恢复本次涉及单集的原状态，既保留其他请求的结果，也保留原先部分已看的组合；还要用会话版本阻止旧账号请求污染新账号。'},
      task:'<h3>比较“页面变化”和“数据保存”</h3><p>仅用本地测试账号：先加载个人列表，Network 切 Offline，点一次追番，观察失败提示与回滚，再恢复 Online。刷新检查服务器记录。</p><p><strong>验收：</strong>能记录请求方法、请求 JSON、失败信息，以及刷新后的状态。再运行：</p>'+pre('node --test tests/anime-selections.test.mjs tests/anime-episode-views.test.mjs tests/auth.test.mjs')+'<p>这些函数测试通过并不等于真实登录 API 已集成验证；完整检查见“调试”课。</p>',
      resources:[{title:'better-sqlite3：同步事务 API',url:'https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md'}]
    },
    {
      id:'data',nav:'数据：静态目录与个人记录',title:'哪些数据能改，应该在哪里改？',subtitle:'来源优先级、数据库约束与生成文件',time:'40–50 分钟',tags:['数据来源','SQL / schema','SQLite 与私有文件'],
      lead:'维护不是找到一个值就改它。先知道这个值的权威来源、生成方式和使用者，才能让修改在下次生成或刷新后仍然成立。',
      sections:[
        {title:'1. 同样叫“数据”，寿命和归属却不同',html:table(['数据','权威位置','刷新 / 发布后'],[
          ['番剧目录、排期','data/anime.js 与生成的历史目录','随应用构建；不是每次访问实时抓取。'],
          ['收藏与已看','DATA_DIR 中 SQLite 的账号记录','刷新后 GET 重新读取，可跨设备。'],
          ['正在输入的查询、打开的弹窗','React state','页面重建后通常消失。'],
          ['手动主题','浏览器 localStorage 的 ac-theme','保留在当前浏览器，不能当成账号数据库。'],
          ['头像','私有文件 + SQLite avatar_version','由认证接口读取当前版本。']
        ])+'<p>缺少一张卡，先问“目录是否有这部作品”与“这一周有没有它的事件”；已看刷新丢失，先问“PUT 是否成功、GET 是否返回”。两种症状不该用同一个方案修。</p>'},
        {title:'2. 番剧资料按字段合并，不是整体挑一个来源',html:'<div class="flow"><div class="flow-node">YUC<small>中文名、封面、已列排期</small></div><span class="flow-arrow">→</span><div class="flow-node">AniList<small>补空的日期、集数等</small></div><span class="flow-arrow">→</span><div class="flow-node">しょぼい<small>补仍缺失的电视排期</small></div><span class="flow-arrow">→</span><div class="flow-node">约定 / null<small>明确保留未知状态</small></div></div><p>低优先级来源只能补空字段。比如 YUC 有网络首播日，就不能被更晚的电视首播日覆盖。保留来源 URL 和各字段的 Source 审计标记；未公布的分钟时刻保留 null，未明确总集数按当前目录约定为 12，二者含义不同。</p><p>稳定 ID 相当于数学对象的身份，标题只是属性。两个来源的标题相似，不足以证明它们是同一部作品；误合并会连带污染收藏、已看和排期。</p><p>封面 coverUrl 是逻辑键，不一定是独立图片文件。运行时通过 cover-sprites.js 映射到本地 WebP 图集；一个封面错误可能是映射或图集问题，不一定是 URL 拼错。</p>'},
        {title:'3. 看见“generated”，先找生成它的脚本',html:'<p>下面是重核历史年份的流水线。它会联网、生成数据并处理封面，<strong>只在确实执行资料维护时运行</strong>；阅读教材不需要触发。</p>'+pre('node scripts/generate-anilist-pilot.mjs 2025\nnode scripts/generate-yuc-history-pilot.mjs 2025\nnode scripts/generate-syoboi-history.mjs 2025\nnode scripts/generate-yuc-history-pilot.mjs 2025\nnpm run convert:covers-webp\nnpm run generate:cover-sprites\nnpm test\nnpm run lint -- --ignore-pattern .worktrees')+'<p>第二次 YUC 生成不是重复工作：第一次提供匹配目录，しょぼい步骤据此生成新快照，第二次再把快照合回最终目录。2026 参数下，历史脚本负责 1 月 / 4 月；7 月当前季直接在 data/anime.js，还要核对 YUC 作品详情的先行信息。</p><p>不要手改 yuc-history、syoboi-history、cover-sprites，也不要修 .next 里的构建产物。下次生成会覆盖它们；应该回到输入或生成规则。</p>'},
        {title:'4. 数据库表，是带约束的关系集合',html:src('db/schema.ts',1,39,'<p>字段定义结构，primaryKey 保证身份唯一。收藏主键为 (userEmail, animeId)；已看主键还包含 episodeStart 和 episode。表的约束与服务器的业务校验共同保护数据。</p>')+'<p><code>Drizzle</code> 把 TypeScript 的表与查询描述转换为 SQL；它不会让数据库变成 React state。<code>WHERE user_email = ?</code> 限定账号范围；参数绑定把数据与 SQL 结构分离，不应手工拼接用户输入。</p>'+pre('-- 教学 SQL；用独立内存数据库运行\nSELECT anime_id\nFROM anime_selections\nWHERE user_email = ?;')+'<p>schema 是代码描述的目标结构，migration 是升级现有数据库的步骤。<code>npm run db:generate</code> 生成 SQL 和 journal；<code>npm run db:migrate</code> 应用迁移。当前首次连接也会自动执行迁移。生成和应用是两件事，必须同时检查 SQL、迁移记录与旧数据。已应用迁移保存 SHA-256 校验和，不能回头修改旧文件，应新增迁移。</p><div class="callout amber"><strong>遇到 no such table，不要删库重来。</strong><p>先确认 Node 进程实际使用的 DATA_DIR、目录权限与迁移是否成功。相对路径按进程工作目录解析；同一份源码从不同目录启动可能读到另一份库。不要删库掩盖错误，也不要把练习库成功当作线上库已升级。</p></div>'},
        {title:'5. 头像为什么需要两处存储',html:'<p>SQLite 保存当前 avatar_version，文件内容位于 <code>DATA_DIR/avatars/邮箱哈希/UUID.webp</code>。两者在同一台服务器上，但文件写入不受 SQL 回滚控制。失败处理仍要跨越“文件成功、数据库失败”的边界。</p>'+src('lib/server/avatar-storage.js',47,70,'<p>先创建新文件并完成写入，再提交数据库版本；失败时删除新文件，成功后清理旧版本。若先删旧头像，一次失败上传就可能让原头像永久丢失。</p>')+'<p>客户端拿到的 URL 指向认证接口，不是 public 静态路径。'+link('app/api/auth/avatar/route.ts',9,26,'读取与缓存规则')+'要求 URL 的 v 参数匹配当前版本；匹配时允许 private immutable 缓存，未指定版本则 no-store，并以 Cookie 区分响应。旧头像问题要查“URL 版本 → 数据库版本 → 文件”，不能只让用户无限清缓存。</p>'},
        {title:'6. 在独立数据库里学会 SELECT、约束与事务',html:'<p>关系表不要求按行号访问；SELECT 描述满足条件的集合，WHERE 限定记录，复合主键限定“不能重复”的身份范围。下面在进程内新建数据库，结束即消失。它不打开项目 DATA_DIR。</p>'+pre('node --input-type=module - <<\'JS\'\nimport Database from "better-sqlite3";\nconst db = new Database(":memory:");\ndb.exec("CREATE TABLE selections (email TEXT, anime_id TEXT, PRIMARY KEY(email, anime_id))");\nconst insert = db.prepare("INSERT INTO selections VALUES (?, ?)");\ninsert.run("learner@example.test", "demo-a");\ntry {\n  db.transaction(() => {\n    db.prepare("DELETE FROM selections WHERE email = ?").run("learner@example.test");\n    insert.run("learner@example.test", "demo-b");\n    insert.run("learner@example.test", "demo-b");\n  })();\n} catch (error) {\n  console.log(error.code);\n}\nconsole.log(db.prepare("SELECT anime_id FROM selections WHERE email = ?").all("learner@example.test"));\ndb.close();\nJS')+'<p><strong>预期：</strong>报主键冲突，最后仍然只有 demo-a。因为同一事务内第二次插入失败，删除和第一次插入一起回滚。把第二次 demo-b 改为 demo-c 再运行，应该得到 demo-b 与 demo-c；每次进程都是新内存库。</p>'+src('db/sqlite.js',14,33,'<p>真实迁移同样放在事务中，并依据 journal 顺序读取 SQL。__app_migrations 记录已应用文件的校验和；重复启动跳过一致文件，发现旧 SQL 被改则报错。它是迁移历史校验，不是用户业务表。</p>')+'<p><strong>验收：</strong>分别解释事务失败、参数绑定、主键冲突和迁移校验和的作用。再运行 <code>node --test tests/database.test.mjs</code>，观察真实 SQLite 迁移失败回滚与完整性测试；不要为练习更改生产迁移。</p>'}
      ],
      quiz:{question:'生成的历史目录里有错误时，最合理的第一步是什么？',options:['直接改生成结果，测试通过就结束','找来源字段和生成脚本，纠正源头后按顺序重生成','把未知时刻统一填 20:00，保证卡片可见'],answer:1,explanation:'生成结果会被覆盖，时刻也不能猜。先查来源、映射与合并优先级，再改负责的输入或规则，并验证最终输出。'},
      task:'<h3>在内存里看看四张真实表</h3>'+pre('python3 teach/exercises/schema.py')+'<p>脚本读取 drizzle 下的迁移，在 Python 的内存 SQLite 中执行，不访问真实账号库。</p><p><strong>验收：</strong>看到 users、auth_sessions、anime_selections、anime_episode_views 四张表，解释为什么不同用户能收藏同一部作品，而同一个用户不能重复收藏同一 ID。</p><details><summary>参考答案</summary><p>唯一性约束针对复合键 (user_email, anime_id)。两个用户 email 不同，复合键不同；同一用户同一作品重复时冲突。</p></details>'
    },
    {
      id:'debug',nav:'调试：用证据缩小范围',title:'把“哪里坏了”变成一个可验证的问题',subtitle:'复现、假设、反例、最小修复、回归',time:'45–60 分钟',tags:['开发者工具','回归测试','红 → 绿'],
      lead:'调试很像证明：先把命题写精确，再找能区分假设的证据。不要同时修改五个地方，然后仅凭页面恢复就断言找到原因。',
      sections:[
        {title:'1. 先把环境启动正确',html:pre('node --version       # 要求 >=22.13.0\nlsof -nP -iTCP:3000 -sTCP:LISTEN  # 只读检查端口占用')+'<p>在<strong>项目根目录</strong>执行。编辑器、浏览器和终端同时打开：编辑器读源码，浏览器给输入并观察，终端运行工具及显示服务器日志。启动时复用 <a href="#node">Node 课的临时 DATA_DIR 与显式端口步骤</a>，不要另起一个使用日常 storage 的练习实例；报端口占用时先确认是谁的服务。</p><p>看到 <code>no such table</code> 或缺少 avatar_version，优先诊断DATA_DIR、目录权限和迁移。看到缺模块，检查 npm ci 是否完成与 Node 版本。看到普通 401，先判断是否还没登录。这些都不能靠改日历组件解决。</p>'},
        {title:'2. 写出一份能被另一个人复现的 bug 报告',html:pre('环境：本地 / 线上，浏览器，桌面或手机宽度\n输入：具体番剧 ID、日期、集数；是否已登录\n步骤：从哪个页面开始，依次点什么\n预期：根据哪条业务规则，应该出现什么\n实际：截图 / 状态码 / 日志中的具体差异\n范围：所有作品还是一部？所有日期还是 05:00？')+'<p>“凌晨高光错了”还太宽；“北京时间 8 月 1 日 05:00，当前日期高光落在 7 月 31 日”就是可测试的反例。你已有的边界测试意识在这里完全适用。</p>'},
        {title:'3. 每次观察都要排除一类原因',html:table(['观察','下一步检查','先不要做什么'],[
          ['没有发送请求','按钮是否禁用、事件处理函数、登录/加载条件。','直接改数据库。'],
          ['请求 400','查看 payload 与响应 error，对照服务器校验。','削弱校验来放行非法数据。'],
          ['请求 401','Set-Cookie、随后是否携带、会话是否过期。','相信页面上显示的昵称就一定认证成功。'],
          ['请求 500','本地 dev 终端或服务器日志，定位异常层。','把所有异常当作前端 bug。'],
          ['响应正确、界面错误','state、筛选、返回值、CSS 与布局。','重复发请求掩盖渲染问题。'],
          ['保存 200、刷新后不对','检查随后 GET 的账号与记录，是否有并发覆盖。','仅凭乐观 UI 判断保存成功。']
        ])+'<p>Elements 查看最终 DOM 与生效样式；Console 看浏览器异常及断点变量；Network 查请求边界；dev 终端看服务器执行。浏览器 Console 不包含 Node 服务端日志。当前 errorResponse 会记录操作名与安全错误码，不会把密码、Cookie、令牌或请求体打印出来；定位 500 时先看本地终端或容器日志，必要时在隔离测试环境给对应 catch 设断点。</p>'},
        {title:'4. 用一个小测试，把 bug 固定在纸上',html:'<p>选择最小的纯函数入口。先写能失败的断言，再只改根因，重新运行同一个测试。测试应表达业务预期，不应该为了跟随当前错误输出而改断言。</p>'+pre('import test from "node:test";\nimport assert from "node:assert/strict";\nimport { calendarDateForDateTime } from "../lib/calendar.js";\n\ntest("05:00 留在自然日期当天", () => {\n  assert.equal(\n    calendarDateForDateTime("2026-08-01", "05:00"),\n    "2026-08-01",\n  );\n});')+'<p>这是说明测试结构的示例；仓库已有相关边界测试。实际练习请编辑 teach/exercises/repair.mjs，里面故意放了三个缺陷，让你安全体验一次红到绿。</p><div class="actions"><a class="button" href="#lab">打开三个修复练习 →</a></div>'},
        {title:'5. 测试通过，到底证明了什么',html:table(['检查','覆盖范围','没有证明什么'],[
          ['node --test 某个文件','对应函数输入输出或该测试写下的约束。','没有执行的路径不受保证。'],
          ['npm run typecheck','TypeScript 静态类型关系。','不验证真实 JSON 或业务正确性。'],
          ['npm run build','生成 Next standalone 服务、静态资源与维护脚本。','不能代替登录和点击测试。'],
          ['npm test 的真实 HTTP 检查','在临时 DATA_DIR 启动 standalone，验证登录、账号隔离、写入与 HTML。','不证明公网 DNS、HTTPS、生产目录权限或所有浏览器交互。'],
          ['浏览器实际操作','真实输入、请求、焦点、显示与响应。','只说明做过的具体情景。']
        ])+'<p>修改业务代码后，按仓库要求运行下面两条；<code>npm test</code> 已包括严格类型检查与构建，不需要为了“更放心”无意义重复三遍。</p>'+pre('npm run lint -- --ignore-pattern .worktrees\nnpm test\n# npm test = typecheck → build → scripts/test.mjs → 真实服务与测试\n\ngit diff --check')+'<p>最后手工确认受影响的用户路径：桌面与手机、成功与失败、刷新后持久化、键盘焦点和浏览器前进后退。通过不相关测试不能代替这些验收。</p>'},
        {title:'6. 看懂测试如何隔离真实服务器',html:src('scripts/test.mjs',9,26,'<p>脚本找一个回环端口，在系统临时目录创建 DATA_DIR，把这些配置交给独立服务子进程。测试结束后会清理进程和临时数据，因此不会使用你的日常账号库。</p>')+'<p>随后脚本等 /api/health 真正成功，再运行测试并提供 TEST_BASE_URL。此时测试发的是 HTTP，不是假设 route 函数正确。直接跑某些 test 文件时，没有这个地址就会跳过 HTTP/HTML 场景；看到绿色之前先看 skipped 数量与测试说明。</p>'+pre('npm run test:unit\n# 快速定位；允许 HTTP/HTML 场景跳过\n\nnpm run lint -- --ignore-pattern .worktrees\nnpm test\n# 业务改动完成后的完整检查')+'<p>三类失败要分开读：类型或构建失败尚未到 HTTP 测试；health 超时先看启动日志与原生 SQLite 模块；某条 assertion 失败则从 expected/actual 与具体测试输入定位。不要为了让输出全绿而移除断言或把失败测试改为 skip。</p><p>如果只改了教材，可以运行教材测试；如果改动 app、lib、data、db 等业务范围，应遵循仓库的完整验证要求。验证记录写实际执行的命令、通过/失败/跳过的范围，不抄教材里的历史通过数量。</p>'}
      ],
      quiz:{question:'保存接口返回正确 JSON，但页面没更新，下一步最有信息量的检查是什么？',options:['先改数据库 schema','检查处理响应的 state 更新、派生值与渲染分支','升级所有依赖'],answer:1,explanation:'正确响应已把问题范围缩到浏览器侧。先看数据怎样进入状态以及界面怎样消费它，避免扩大修改范围。'},
      task:'<h3>完成第一次真实的红 → 绿</h3>'+pre('node --test teach/exercises/repair.test.mjs')+'<p>初始失败是刻意设计。打开 <code>teach/exercises/repair.mjs</code> 修复三个 TODO 后，重复同一命令。</p><p><strong>验收：</strong>6 个测试全过；能指出每个失败对应的输入、预期、根因和最小修改。需要核对时运行 <code>TEACH_SOLUTION=1 node --test teach/exercises/repair.test.mjs</code> 查看参考实现的结果，但不能用它冒充你已经修好练习。</p>'
    },
    {
      id:'maintenance',nav:'维护：把改动交付得可靠',title:'从“我会改”到“我敢维护”',subtitle:'按影响面选文件、测试与交付边界',time:'35–50 分钟',tags:['维护流程','Git','毕业任务'],
      lead:'你不必先熟读整个项目才能开始维护。先负责一个小闭环：说明行为、找到边界、做最小修改、给出证据。',
      sections:[
        {title:'1. 每次动手前，写下三句话',html:'<ol><li><strong>成功标准：</strong>什么具体输入下，用户应该看到什么。</li><li><strong>负责位置：</strong>哪个函数或文件决定这个行为，调用者有哪些。</li><li><strong>验证方法：</strong>哪个测试先失败，修后还需检查哪些用户路径。</li></ol><p>然后用 <code>git status --short</code> 确认已有改动。当前仓库可能同时有别人或上一轮工作的修改；不要用“顺手清理”覆盖它们。先查看 AGENTS.md 的约定，再实施当前任务范围。</p>'},
        {title:'2. 常见维护任务，从哪个入口开始',html:table(['任务','先读哪里','验收重点'],[
          ['搜索规则错误',link('lib/anime-search.js',1,10),'中文/日文、全角/空格、空查询；结果仍来自全库。'],
          ['日期、集数、午夜显示',link('lib/calendar.js',129,142),'00:00/04:59/05:00、跨周、先行+周播、手机与标线。'],
          ['卡片大小或颜色',link('app/styles/tokens-base.css',1,45)+'，再找对应 JSX class','两主题、860px 断点、尺寸作用域、焦点和 aria。'],
          ['收藏或已看丢失',link('app/hooks/use-viewer.tsx',208,241)+' → 对应 API → lib 校验','PUT/GET、账号隔离、失败回滚、刷新与并发。'],
          ['新增历史资料','scripts/generate-*.mjs、data 来源约定','来源优先级、稳定 ID、catalogCount、先行排期、封面映射。'],
          ['新增数据库字段',link('db/schema.ts',1,39)+'、drizzle/','生成并审查迁移，确认应用到正确环境，再验证旧数据。']
        ])},
        {title:'3. Git 不是备份按钮，是可审查的差异记录',html:pre('git status --short          # 看已有改动\ngit diff -- app/page.tsx    # 示例：只看负责的文件\ngit diff --check           # 差异中的空白错误\n\n# 验证后，只暂存本次明确修改的文件（用真实路径替换）\ngit add path/to/changed-file\ngit diff --cached           # 审查将进入提交的实际内容\ngit commit -m "fix: describe the observed behavior"')+'<p>上面是操作模板，不要原样提交 path/to/changed-file。工作区是正在编辑的版本，暂存区是挑选进下一次提交的差异，commit 是本地历史，push 才发给远端。提交成功不等于网站已经部署。</p><p>用清楚的说明收尾：“什么输入曾失败 → 改了哪条规则 → 哪些验证通过”。不要只写“修了 bug”。有无关修改时避免 <code>git add .</code>，也不要用 reset --hard 或强推清除问题。</p>'},
        {title:'4. 从已验证的代码走向可运行版本',html:'<p>一次 commit 固定源码，build 生成与之对应的可运行产物，deploy 把产物交给服务器。当前产物是 <code>.next/standalone/</code>，正式运行可封装进 Docker 镜像；不是把 app 文件夹上传后双击页面。构建不包含你的个人数据库，也不会自动更新番剧目录。</p><p>提交前审查准确的暂存差异，发布前审查准确的提交和镜像。远端有新提交时先整合并重新验证，不能把“昨天测过”当作当前版本的证据。更新涉及迁移时，代码回退和数据库回退必须分别判断；具体备份、镜像与恢复演练在后续运维课程完成。</p><div class="callout"><strong>最小修改，会减少验证范围。</strong><p>公共日期函数有多个显示消费者，修公共规则并检查每个消费者，通常比在多处 JSX 添加日期补丁更容易验证。操作记录应能回答：哪个版本、哪个数据目录、做了什么、怎样确认。</p></div>'},
        {title:'5. 与编码助手协作时，你负责守住规格',html:'<p>你可以让工具帮忙找调用链、解释类型、起草测试，但先让它交代输入、输出和证据。把“这个好像错了，帮我改”改写成下面这种任务：</p>'+pre('现象：北京时间 05:00 的日期高光不符合当天规则。\n成功标准：00:00–04:59 归前一放送日，05:00 起归当天。\n请先找公共日期映射函数与所有调用者，给出最小复现测试。\n只修改相关函数和测试，保留已有工作区改动。\n完成后报告改动原因、验证结果与未覆盖情景。')+'<p>这个提示示例是假设性 bug 报告；当前项目已经有正确的阈值实现。你需要检验助手的解释是否与实际代码一致，而不只看它说“测试通过”。</p>'},
        {title:'6. 三个毕业任务，逐步获得维护能力',html:'<details><summary>A · 只读追踪：讲清楚一次“下一周”</summary><p>从 CalendarPage 找 changeWeek、activeWeekStart、eventsForWeek，再到 CalendarSchedule 看桌面/手机渲染。解释公共目录有没有发生网络刷新。验收：画出 4–6 个节点，给每个节点标真实函数名与数据。</p></details><details><summary>B · 局部修改：在练习副本支持带连字符标题</summary><p>编辑 teach/exercises/repair.mjs 的 normalizeTitle，让“foo-bar”和“foobar”匹配。先在 repair.test.mjs 添加对应断言，确认失败再修改。验收：新增断言与原有 6 个断言都通过，说明这会不会影响日文标题或空查询。</p><p>这只是练习需求；真实项目是否应该忽略连字符，需先决定产品规则，不能直接照搬。</p></details><details><summary>C · 项目维护提案：搜索词随 URL 恢复</summary><p>当前 q 未写入 URL。先写一页规格：空查询、直接访问、刷新、后退前进各怎么表现；列出 state 与 URL 谁为权威，准备对应测试。验收：同学能按规格逐步检查，不会因模糊描述产生两个实现。</p><p>这是一份提案练习，不要求现在修改真实页面。若以后批准实现，再按最小改动流程做。</p></details>'}
      ],
      quiz:{question:'日期 bug 的公共函数被桌面、手机、高光、标线调用，怎样修更可靠？',options:['在报告中提到的那张桌面卡上单独减一天','修正公共映射函数，并验证所有受影响的消费者','把所有日期判断搬进 JSX'],answer:1,explanation:'公共规则只保留一份，调用者消费同一个结果。验证范围跟随影响面，而不是只跟随报告中提到的表面症状。'},
      task:'<h3>给自己做一次闭卷验收</h3><p>不看答案，口头解释：①静态目录与个人数据库的区别；②setter 后发生什么；③一次收藏 PUT 的身份从哪里来；④05:00 的边界；⑤生成文件错了改哪里；⑥测试通过的保证范围。</p><p><strong>达标：</strong>六项全部能讲清，并独立完成 Bug 实验室三个修复。这代表具备代码维护入门能力；还需完成后续上线、恢复和故障演练，才能达到本网站的运营维护目标。答不清的一项回到对应课，不用把整本重学。以后遇到问题，先打开 <a href="#toolbox">维护速查手册</a>。</p>'
    }
  ];
  window.TEACH = { lessons };
  window.TEACH.labHTML = `<header class="lesson-head"><div class="eyebrow">BUG LAB / 安全地把错误修好</div><h1>先让测试失败，<br>再亲手让它通过。</h1><p>三个故意植入的教学故障，与你的项目规则一一对应。网页运行隔离实现；编辑器练习只修改 teach 内的副本。</p></header><div class="callout amber"><strong>两种练法，请分清。</strong><p>下方按钮切换错误 / 修复方案并实际执行断言，帮你观察因果；它不会修改真实项目或终端练习文件。要训练编码能力，请继续完成页面末尾的编辑器练习。</p></div><div data-widget="bug-labs"></div><section class="lesson-section"><h2>接下来：不用选项，自己写出修复</h2><ol><li>在编辑器打开 <code>teach/exercises/repair.mjs</code>，先读三个函数和 TODO。</li><li>运行下面命令，读 assertion error 中的 actual 与 expected。</li><li>每次只修一个函数，重复同一命令；全部 6 个测试通过后才算完成。</li><li>写下“症状 → 根因 → 修改 → 证据”四句话。</li></ol>${pre('node --test teach/exercises/repair.test.mjs\n\n# 只核对参考答案，不替代你的修复\nTEACH_SOLUTION=1 node --test teach/exercises/repair.test.mjs')}<p>初始应有 3 个通过、3 个失败；修复后应全部通过。项目原有测试不导入这些故障副本。</p><details><summary>三个修复的提示（先不要看答案）</summary><p>凌晨：边界到底是 &lt; 还是 ≤？<br>搜索：全角字符是在转小写前后哪一步统一？<br>已看：两个不同集数是否可能得到同一个键？</p></details><details><summary>参考代码所在位置</summary><p>teach/exercises/solution.mjs。先对照具体差异，再解释为什么它满足测试，而不是只复制。</p></details></section>`;
  window.TEACH.toolboxHTML = `<header class="lesson-head"><div class="eyebrow">DESK REFERENCE / 维护时翻这里</div><h1>把问题，带到负责它的地方。</h1><p>这是一张工作时可随手查的桌面卡。先定位层次，再选择命令；不是每个问题都要重新构建或更新资料。</p></header><section class="lesson-section"><h2>症状 → 证据 → 入口</h2>${table(['症状','首先观察','读哪里'],[
    ['搜不到作品','全库是否存在？输入是否全角/空白？',link('lib/anime-search.js',1,10)+' → 页面 searchResults'],
    ['凌晨日期错误','真实北京时间 vs 放送日，00:00/04:59/05:00',link('lib/calendar.js',98,142)],
    ['集数错位','首播 P 集、network、regularStart、episodeSchedules',link('lib/calendar.js',221,300)],
    ['页面卡片重叠','lane/laneCount 与实际 CSS top/left/width',link('lib/calendar.js',180,218)+' → eventButton → CSS'],
    ['追番刷新后消失','PUT 结果、刷新 GET、账号、请求先后',link('app/api/anime-selections/route.ts',23,46)],
    ['已看同时点会丢','目标单集键、批次大小、失败逆操作',link('lib/anime-episode-views.js',62,143)],
    ['登录后仍 401','Set-Cookie、后续 Cookie、会话有效期',link('app/auth.ts',19,35)],
    ['本地注册 500','服务器日志、DATA_DIR、目录权限、表与迁移',link('db/sqlite.js',6,44)+' / DATA_DIR'],
    ['颜色或手机布局坏了','Computed 生效规则、主题、860px 断点',link('app/styles/tokens-base.css',1,45)],
    ['头像显示旧图','当前 avatar_version 与私有文件是否一致',link('app/api/auth/avatar/route.ts',9,55)]
  ])}</section><section class="lesson-section"><h2>命令分三组用</h2><h3>定位与小范围验证（根目录）</h3>${pre('git status --short\nrg -n "函数名或字段名" app lib tests\nnode --test tests/calendar.test.mjs\nnode --test tests/anime-search.test.mjs\nnode --test tests/auth.test.mjs')}<h3>业务改动完成后的仓库检查</h3>${pre('npm run lint -- --ignore-pattern .worktrees\nnpm test\ngit diff --check')}<p>npm test 会类型检查、构建，再启动隔离的真实 standalone 服务执行测试。单独 test:unit 会跳过 HTTP/HTML 测试；它不能替代完整检查。构建会生成文件。浏览器与公网部署仍有单独的验收。</p><h3>只验证教材</h3>${pre('node --test teach/tests/site.test.mjs\npython3 teach/exercises/schema.py\n# 更新源码快照（代码变化后）\npython3 teach/snapshot.py')}<p>快照刷新只更新源码文本，不会自动更新课程解释和行号；运行教材检查后还需核对相邻讲解。网页打开方式：双击 teach/index.html，或在根目录运行 <code>python3 -m http.server 8766 --bind 127.0.0.1 --directory teach</code>。</p></section><section class="lesson-section"><h2>常见名词，用本项目定义</h2>${table(['名词','在这里是什么意思'],[
    ['组件 / props / state','组件是返回界面描述的函数；props 是传入参数；state 是 React 保管的当前记忆。'],
    ['渲染 / DOM / hydration','计算界面描述 / 浏览器元素树 / 把客户端交互接到服务器 HTML 上。'],
    ['事件 / effect','用户触发的处理函数 / 与外部系统同步的 React Hook。'],
    ['Promise / await','未来结果的容器 / 等待结果再继续当前异步函数。'],
    ['API / route / JSON','调用契约 / 接收请求的入口 / 交换数据的字符串格式。'],
    ['Cookie / session','浏览器随请求发送的小段数据 / 服务器认可的登录会话。'],
    ['schema / migration','表的目标结构 / 升级已有结构的步骤。'],
    ['原子性 / 乐观更新','数据库一组操作全部成功或整体失败 / UI 先变，失败再回滚。'],
    ['unit test / regression','隔离验证函数行为 / 防止已知问题再次发生的检查。'],
    ['build / deploy','生成可运行产物 / 把该产物发布到运行环境。'],
    ['lint / typecheck','检查代码约定和一些可疑模式 / 检查静态类型关系。'],
    ['Node / Next / standalone','JS 服务端运行环境 / 应用框架 / 含运行所需依赖与资源的构建产物。']
  ])}</section><section class="lesson-section"><h2>下一次维护，只填这张记录</h2>${pre('问题与最小复现：\n业务规则与预期：\n定位证据（请求 / 日志 / 断言）：\n负责函数与调用者：\n最小改动：\n通过的验证：\n还未覆盖的情景：\n是否涉及迁移 / 发布：')}<p>这份教材依据当前工作区，而不是线上站点状态。代码变动后，以实际函数和测试为准；不要把教材中的旧行号当作规则本身。</p></section>`;
})();
