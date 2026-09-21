(() => {
  const pre = code => '<pre><code>' + code.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;') + '</code></pre>';
  const code = (strings, ...values) => pre(String.raw(strings, ...values));
  const link = path => `<button class="source-link" data-source="${path}" data-start="1" data-end="1">${path} ↗</button>`;
  const src = (path, start, end) => `<div data-snippet="${path}" data-start="${start}" data-end="${end}"></div>`;
  const example = name => 'teach/exercises/node-http/' + name;
  const answer = (title, html) => `<details><summary>${title}</summary>${html}</details>`;
  const table = (heads, rows) => '<div class="table-wrap"><table><thead><tr>' + heads.map(h => `<th>${h}</th>`).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(c => `<td>${c}</td>`).join('') + '</tr>').join('') + '</tbody></table></div>';
  const index = window.TEACH.lessons.findIndex(lesson => lesson.id === 'node');
  const original = window.TEACH.lessons[index];
  const sections = [
    { title: '这章要解决的具体问题', html: `<p>假设你要给番剧日历增加一个“已看统计”接口。现在先拿走 React、数据库和部署工具，只留下一个 Node 进程与几个 HTTP 请求。你将亲手建立这条链：<strong>终端启动程序 → 程序监听端口 → 收到请求 → 分支处理 → 返回响应 → 客户端解释结果</strong>。之后再把每一步对应回真实仓库。</p><p>本章按约 5–8 小时设计，可分三次完成；时长是学习安排，不是保证。第一次做到查询接口，第二次做到保存与重启实验，第三次完成独立统计接口并回到 Next 项目。每个代码块先预测、再运行，保留实际输出。只阅读不运行，无法验证你是否理解了执行过程。</p>` + table(['材料', '你要做什么', '到达的能力'], [
      ['01-hello.mjs', '先手写核心 7 行，再对照完整文件。', '解释服务为什么不退出，以及响应如何发出。'],
      ['02-routes.mjs', '比较方法、路径、查询参数；自己增加一个查询。', '按接口约定区分 200、400、404、405。'],
      ['03-memory.mjs', '写入、重复写入、非法写入、重启、双实例实验。', '解释输入校验、异步正文与数据寿命。'],
      ['04-student.mjs', '在 TODO 处独立实现统计；运行 assessment.test.mjs。', '根据约定写接口，并用真实 HTTP 结果验收。']
    ]) + `<div class="callout"><strong>准备两个终端窗口，都进入项目根目录。</strong><p>终端 A 运行服务器，终端 B 发请求。以下路径都从项目根目录解析。示例使用 Node 内置模块，不需要先运行 npm ci。确认 <code>node --version</code> 满足本项目的 ≥22.13.0；本章 curl 命令按 macOS / zsh 编写。</p></div><p>示例中的三部作品是合成练习数据，所有写入只进入示例进程的内存。它们没有账号隔离、数据库或公开服务所需的完整防护，仅监听本机。真正的番剧日历仍由 Next 与 SQLite 负责。</p>` },
    { title: '先分清语言、运行时和程序', html: `<p>你写 <code>python main.py</code> 时，Python 源码由 Python 运行时执行。<code>node main.mjs</code> 的对应关系相同：JavaScript 是语言，Node 是提供执行引擎和系统能力的运行时。浏览器也能执行 JavaScript，但它提供 DOM；Node 提供进程、文件和网络能力。语言相同，不代表可用的全局对象和权限相同。</p>` + code`node --input-type=module -e 'console.log(1 + 2); console.log(typeof document); console.log(process.version);'` + `<p>应先输出 <code>3</code>，再输出 <code>undefined</code>，最后输出你的 Node 版本。<code>-e</code> 表示执行命令行里的代码；单引号让 shell 原样传入。没有 document，并不妨碍 Node 生成 HTML 文本，它只是没有浏览器的页面元素树。</p>` + table(['马上会遇到的语法', '如何读', '不要误解为'], [
      ['import { createServer } from "node:http"', '从 Node 内置 HTTP 模块导入一个具名函数。node: 是内置模块前缀。', '不需要 npm install node:http。'],
      ['const server = …', '声明一个不能重新赋值的绑定。', '绑定不变，不等于对象内容不能变。Set 仍能 add。'],
      ['(req, res) => { … }', '创建一个函数值，有两个参数；此时还没有调用。', '不是 C++ 引用，也不是类型标注。'],
      ['{ "Content-Type": "text/plain" }', '对象字面量，用键和值描述一组属性。', 'JavaScript 对象还不是网络上发送的 JSON 字节。'],
      ['.mjs / export / import', '这里用 .mjs 明确采用 ES 模块；export 暴露函数供别的模块导入。', '导入一个函数不等于自动启动服务器。']
    ]) + `<p>npm 是依赖管理与脚本入口，React 是界面库，Next 是组织路由、渲染与构建的框架。我们先用 Node 自带的 HTTP 模块理解底层，再看 Next 帮你省去了哪些工作。你不必先学完全部 JavaScript；本章用到的新语法会在第一次出现时解释。</p>` },
    { title: '手写第一个会回应的服务器', html: `<p>在 <code>teach/exercises/node-http/</code> 下新建自己的 <code>scratch.mjs</code>，输入下面的代码。目录里的编号文件是对照示例，scratch 留给你实验。先猜：这个程序会打印什么？浏览器访问两次，会发生几次回调？</p>` + code`import { createServer } from "node:http";

const server = createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Hello, 番剧日历！\n");
});
server.listen(4310, "127.0.0.1");` + code`# 终端 A：会一直运行，按 Control-C 停止
node teach/exercises/node-http/scratch.mjs

# 终端 B
curl -i http://127.0.0.1:4310/` + `<p><code>curl</code> 是发 HTTP 请求的命令行客户端，<code>-i</code> 让它把响应头也显示出来。关键输出应包含 <code>HTTP/1.1 200 OK</code>、<code>Content-Type: text/plain; charset=utf-8</code> 和正文 <code>Hello, 番剧日历！</code>。Date、连接和长度相关的头可能不同，不要把整段响应逐字当作固定答案。</p>` + table(['代码位置', '做了什么', '为什么需要'], [
      ['createServer(callback)', '创建服务器对象，登记请求处理函数。', '把“以后收到请求怎么做”交给 Node。'],
      ['request', '当前请求对象，包含方法、地址、头与可读正文流。', '不同请求使用不同对象；不是整个服务的全局输入。'],
      ['response.writeHead(200, …)', '指定该响应的状态码和响应头。', '告诉客户端如何解释接下来的内容。'],
      ['response.end(text)', '写入最后的正文并结束这条 HTTP 响应。', '客户端需要知道响应已完成；不表示结束服务器进程。'],
      ['server.listen(4310, "127.0.0.1")', '让服务监听本机回环地址的 4310 端口。', '服务才能接收发往这个地址与端口的连接。']
    ]) + `<p>用浏览器打开相同地址，也会显示文本。一个网络请求不要求服务器返回 HTML；文本、JSON、图片都可以成为响应正文。浏览器有时还会额外请求 favicon，因此精确数请求时先用 curl。</p>` + answer('先预测：访问 /missing 或用 POST 请求，会怎样？', `<p>这个初版没有检查路径和方法，所以都会返回同一个 200 和 Hello。<strong>端口能连通，只能证明有程序应答，不能证明目标接口存在。</strong>下一版我们才加入路由判断。</p>`) + `<p>带启动日志、端口校验和错误处理的完整版本：${link(example('01-hello.mjs'))}。停止 scratch 后，可用 <code>node teach/exercises/node-http/01-hello.mjs</code> 启动它；不要让两个程序争用同一个端口。</p>` },
    { title: '回调、进程与端口：为什么程序没有结束', html: `<p>在竞赛程序中，读完输入、输出结果后通常退出。服务器把输入分散到了未来：Node 等待网络事件，收到一条请求后调用你登记的函数。<code>createServer</code> 不会立刻替你处理一个虚构请求，<code>listen</code> 也不会按 while(true) 不停调用回调。</p>` + code`console.log("A：创建之前");
const server = createServer((request, response) => {
  console.log("C：收到", request.method, request.url);
  response.end("ok");
});
console.log("B：调用 listen 之前");
server.listen(4310, "127.0.0.1", () => console.log("D：已开始监听"));` + `<p>在 scratch 中保留 import，并用这段替换后半部分。正常启动先出现 A、B、D，只有发请求才出现 C。最后一个箭头函数是“监听成功”回调，不是请求回调。监听中的服务器会让进程保持活动；终端没有返回提示符不是卡死。</p><p>端口可理解为一台主机上用于区分网络服务的编号。<code>127.0.0.1</code> 指本机，不是你以后租的服务器。完整示例允许 <code>PORT=4311 node …</code> 临时指定端口；命令前的赋值是 shell 传给进程的环境变量，程序通过 <code>process.env.PORT</code> 读到字符串，再检查是否为合法整数。只改变访问 URL，不会让服务自己换端口。</p><p>完整文件末尾的 <code>import.meta.url === pathToFileURL(process.argv[1]).href</code> 区分“直接执行这个文件”和“被测试文件导入”。<code>process.argv[1]</code> 是入口脚本路径，pathToFileURL 将路径转为可比较的文件 URL。测试只需要导出的 create…Server 函数，再让系统分配临时端口；它不应该在导入时自动占用 4310。</p>` + answer('故障推演：删去 response.end，改成 return "ok"，客户端能收到字符串吗？', `<p>不能。普通函数的返回值只交给调用者；Node 的 HTTP 请求回调不会把它自动转换成响应。此时客户端可能一直等待，最后超时。<code>return response.end("ok")</code> 同时完成两件事：调用 end 发送响应，再 return 退出本次回调，避免继续执行后续分支。Next 的路由函数则有另外一套返回 Response 的约定，后面会对照。</p>`) },
    { title: '把一次 HTTP 往返拆开看', html: `<p>下面是 curl 往返的概念展开，省略了自动生成的头。HTTP/1.1 的状态行、头和空行在网络上按协议编码，<code>curl -i</code> 将它们显示成易读文本；正文可以是任意字节。</p>` + code`GET /api/anime?title=orbit HTTP/1.1
Host: 127.0.0.1:4310
Accept: application/json

HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"anime":[]}` + `<p>上半段是请求，下半段是响应。请求的 <code>GET</code> 是方法；<code>/api/anime</code> 是路径；问号后的 title 是查询参数；Host 指定目标主机与端口。响应的 200 是结果状态；Content-Type 是正文格式声明；空行后才是正文。例子查的是英文 orbit，而合成目录按中文 title 搜索，所以空列表仍是正确的查询结果。</p>` + table(['容易混淆的两项', '区别'], [
      ['URL / 方法', '同一个 /api/watched，GET 可表示读取，PUT 可表示更新。只知道路径不足以确定动作。'],
      ['请求头 / 响应头', '请求的 Content-Type 说明你发的正文；响应的 Content-Type 说明服务器回的正文。互不替代。'],
      ['Accept / Content-Type', 'Accept 表达希望收到什么；Content-Type 声明这份正文实际是什么。它们不会自动转换内容。'],
      ['状态码 / 正文', '状态码告诉客户端如何处理结果，正文携带数据或错误说明。返回 {error:…} 却保持 200，会误导只检查状态码的调用方。'],
      ['HTTP 响应 / 网络失败', '404 是服务器成功送回的错误响应。连接被拒绝时，根本没有收到 HTTP 状态码。']
    ]) + `<p>GET 通常用于读取；本课程的读取请求不带正文，参数放在 URL。写入例子用 PUT 和 JSON 正文。POST、PUT 并没有“天然替你存数据库”的能力，它们只是协议语义，需要应用实现。先观察请求实际上发了什么，别凭按钮名字猜请求方法。协议背景可查 <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview" target="_blank" rel="noreferrer">MDN HTTP 概览</a>。</p>` },
    { title: '从一个响应，扩展到按路径和方法分流', html: `<p>停止 01，启动第二版。先只运行命令并抄下“状态码 + 正文”，再看实现：</p>` + code`# 终端 A
node teach/exercises/node-http/02-routes.mjs

# 终端 B：四个请求逐个执行
curl -i http://127.0.0.1:4310/health
curl -i 'http://127.0.0.1:4310/api/anime?title=orbit'
curl -i http://127.0.0.1:4310/missing
curl -i -X POST http://127.0.0.1:4310/api/anime` + `<p>预期依次是：200 与 <code>{"ok":true}</code>；200 与空 anime 数组；404 与错误说明；405 与 <code>Allow: GET</code>。405 表示这个路径存在，但当前方法不支持；Allow 提供可用方法。</p>` + src(example('02-routes.mjs'), 15, 35) + `<p><code>request.url</code> 在这些请求中是路径加查询串。<code>new URL(request.url, "http://127.0.0.1")</code> 用一个基准地址解析相对 URL：这里只取 pathname 与 searchParams，基准中的端口不参与真实监听。<code>url.pathname</code> 不包含问号后面的参数，所以带查询串也能命中同一路由。如果直接拿 request.url 与 "/api/anime" 比较，带 title 时就会误判为 404。</p><p><code>?? ""</code> 在 get 返回 null（缺参数）时提供空字符串；<code>trim()</code> 去掉两端空白；<code>filter</code> 遍历数组，保留回调结果为真的元素；<code>includes</code> 检查标题是否包含查询词。它是示例的简单、区分大小写的包含搜索，不等于真实项目的中日文规范化匹配。</p>` + code`curl -i -G --data-urlencode 'title=放映室' http://127.0.0.1:4310/api/anime` + `<p><code>-G</code> 把参数放入 GET 查询串，<code>--data-urlencode</code> 负责 URL 编码。预期返回 aurora 与 orbit 两条，不返回 comet。<code>?title=</code> 和没有 title 都会返回三条，因为任何字符串都包含空字符串。路径 /api/anime/（多一个尾斜杠）在此示例中也不自动等同于 /api/anime。</p>` },
    { title: '对象如何变成 JSON，再回到对象', html: `<p>服务器内存中的数组不会直接穿过网络。第二版使用下面这个小函数，把所有 JSON 响应的“声明格式 → 序列化 → 结束响应”放到一起：</p>` + src(example('02-routes.mjs'), 10, 13) + `<p><code>JSON.stringify(value)</code> 将 JavaScript 值编码为 JSON 文本；字符再按 UTF-8 发送。客户端反向读取字节并解析 JSON。JSON 不支持函数、undefined 或 Set 等完整 JavaScript 类型，因此第三版会先把 Set 转成数组再序列化。两端并不共享同一个对象，客户端修改解析出来的数组不会直接改服务器内存。</p><p><code>headers = {}</code> 是默认参数；<code>...headers</code> 将额外头展开进新对象。这样 405 可以加 Allow，同时沿用 JSON 格式。声明 Content-Type 并不能让错误文本自动变成 JSON；如果正文是 HTML，客户端调用 JSON.parse 仍会失败。</p>` + code`# 终端 B：用 Node 自带的 fetch 做一次客户端读取
node --input-type=module -e '
  const response = await fetch("http://127.0.0.1:4310/api/anime");
  console.log(response.status, response.ok);
  const payload = await response.json();
  console.log(payload.anime.length);
'` + `<p>预期是 <code>200 true</code> 和 <code>3</code>。<code>await fetch</code> 等到可用响应，<code>await response.json()</code> 还要等待并解析正文。前者成功不代表后者一定成功。Response 正文是流，普通情况下只能消费一次；不要先 json() 再 text() 期待重新读到同一份内容。</p>` + answer('把地址改成 /missing，fetch 会自动抛出异常吗？', `<p>这个服务会正常送回 404 JSON 响应，因此 fetch 返回 Response，status 为 404、ok 为 false。若随后仍读 payload.anime.length，就会出现另一种 JavaScript 错误，因为错误正文根本没有 anime。正确调用方先判断 response.ok，再按接口约定解释正文。停掉服务器则属于网络失败，fetch 会拒绝 Promise；两种证据要分别保留。</p>`) },
    { title: '第一次独立迁移：自己写一个参数接口', html: `<p>把 02 复制为自己的 scratch，增加 <code>GET /api/remaining?total=12&amp;watched=3</code>。现在只读需求，暂时不要展开答案：返回 <code>{"remaining":9}</code>；两个参数都必须存在且非空，转成数字后须为安全整数，并满足 0 ≤ watched ≤ total；非法参数返回 400。该路径其它方法返回 405 与 Allow: GET，不存在的路径仍为 404。这里约定接受 Number 能解析的整数写法，不另加“只能十进制数字字符”的限制。</p>` + code`curl -i 'http://127.0.0.1:4310/api/remaining?total=12&watched=3'
curl -i 'http://127.0.0.1:4310/api/remaining?total=12&watched=0'
curl -i 'http://127.0.0.1:4310/api/remaining?total=12'
curl -i 'http://127.0.0.1:4310/api/remaining?total=&watched=0'
curl -i 'http://127.0.0.1:4310/api/remaining?total=12&watched=13'
curl -i -X POST 'http://127.0.0.1:4310/api/remaining?total=12&watched=3'` + `<p>预期状态为 200、200、400、400、400、405，前两次 remaining 为 9、12。URL 要用引号包住，防止 shell 把 &amp; 解释成后台执行；这些引号不会成为 URL 的一部分。</p>` + answer('提示一：为什么 if (!watched) 与 Number(raw) 不够？', `<p>数值 0 是 falsy，因此 !watched 会把合法的“未看任何一集”拒绝掉。另一方面 Number(null)、Number("") 都得到 0，单纯数值检查会把缺参数误认为零。先检查原始字符串是否存在且非空，再转换，最后检查整数与范围。</p>`) + answer('提示二：路由要改两处', `<p>先把 /api/remaining 加到“已知路径”条件，再在方法检查之后、原有标题查询之前加入新路径的分支。只加处理分支却不改前面的 404 判断，新分支永远走不到。方法检查必须覆盖新路径。</p>`) + answer('完成并留存输出后，再看参考实现', code`// 02 中的路径白名单改为：
if (!["/health", "/api/anime", "/api/remaining"].includes(url.pathname)) {
  return sendJson(response, 404, { error: "找不到这个接口" });
}
// 保留原有 GET 方法检查；在原来的标题查询前插入：
if (url.pathname === "/api/remaining") {
  const totalRaw = url.searchParams.get("total");
  const watchedRaw = url.searchParams.get("watched");
  if (totalRaw === null || watchedRaw === null || !totalRaw.trim() || !watchedRaw.trim()) {
    return sendJson(response, 400, { error: "两个参数都必填" });
  }
  const total = Number(totalRaw);
  const watched = Number(watchedRaw);
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(watched)
    || watched < 0 || total < watched) {
    return sendJson(response, 400, { error: "需要 0 ≤ watched ≤ total 的安全整数" });
  }
  return sendJson(response, 200, { remaining: total - watched });
}` + `<p>除了上面六个请求，再自行选一个非整数、一个负数、一个超出安全整数范围的值。为每个反例指出是哪条分支拒绝它。能解释反例比复制这段代码更接近独立实现。</p>`) },
    { title: '写入请求的正文，为什么要异步读取', html: `<p>查询参数已经在 URL 中；JSON 写入的正文却可能尚未全部抵达。即使客户端只发送一次，一个请求也可能被拆成多个字节块。不能把“收到一个 chunk”理解为“收到一条完整 JSON”。更不能在每个 chunk 回调里都 JSON.parse 并修改状态。</p><p>停止第二版，运行 <code>node teach/exercises/node-http/03-memory.mjs</code>。这是第三版收集正文的函数：</p>` + src(example('03-memory.mjs'), 15, 28) + `<p><code>async</code> 函数返回 Promise，表示未来完成的结果；<code>for await … of request</code> 异步迭代请求流，每轮等到一块可用字节。等待期间 Node 可以处理其它就绪任务，这不表示下面的 Set 操作自动并行。<code>chunks</code> 是 Buffer 数组，bytes 累加字节数；Buffer 是 Node 表示字节序列的类型。</p><p>结束后先 <code>Buffer.concat</code> 拼接原始字节，再 <code>toString("utf8")</code> 解码，再 JSON.parse。中文字符可占多个 UTF-8 字节，切块可能发生在字符内部；如果每块单独解码再拼字符串，可能产生替换字符。网络如何分块不应改变应用解释出的 JSON。</p>` + code`// 观察用的两个概念块；不是两条请求
chunk 1: {"animeId":"aur
chunk 2: ora","episode":1,"watched":true}

拼接后: {"animeId":"aurora","episode":1,"watched":true}` + `<p>第一个块单独不是合法 JSON，两块拼起来才是。稍后 examples.test.mjs 会用真实 HTTP 发送分次写入的正文；操作系统可能再合并这些写入，测试不控制每次服务端接收的边界。中文位于示例不使用的 note 字段，响应也不会回传它，所以那个测试不能单独证明中文解码无损。下面直接切开字节，观察两种解码顺序：</p>` + code`node --input-type=module -e '
  const bytes = Buffer.from("中");
  const first = bytes.subarray(0, 1);
  const rest = bytes.subarray(1);
  console.log(first.toString("utf8") + rest.toString("utf8"));
  console.log(Buffer.concat([first, rest]).toString("utf8"));
'` + `<p>第一行得到替换字符，第二行才是完整的“中”。subarray 取得字节切片；拼接字节之后再解码，就不会把半个字符当作坏输入。</p><p>本地示例最多保留 4096 bytes；超过后继续读完并丢弃后续块，再返回 413，以便把完整错误响应发回客户端。因此它限制的是保留量，不是完整的超时或恶意慢请求防护。真实项目使用 Web 请求流、128 KiB JSON 上限和不同的取消逻辑，后面会对应源码。Buffer 与流 API 可查 <a href="https://nodejs.org/api/buffer.html" target="_blank" rel="noreferrer">Node Buffer 文档</a> 和 <a href="https://nodejs.org/api/http.html" target="_blank" rel="noreferrer">HTTP 文档</a>。</p>` },
    { title: '能解析 JSON，不代表输入合法', html: `<p>先发一条合法写入，预期 200 与 <code>{"watched":["aurora:1"]}</code>。curl 的 -X 指定方法，-H 添加请求头，--data-raw 发送引号里的文本作为正文：</p>` + code`curl -i -X PUT http://127.0.0.1:4310/api/watched \
  -H 'Content-Type: application/json' \
  --data-raw '{"animeId":"aurora","episode":1,"watched":true}'` + `<p>行尾反斜杠只是让 shell 把下一行拼到同一条命令；它后面不要再跟空格。JSON 中属性名用双引号，true 是布尔值；外面的单引号属于 shell，用来保留 JSON 内部的双引号。</p>` + src(example('03-memory.mjs'), 49, 66) + table(['检查阶段', '反例', '预期'], [
      ['声明格式', '正文仍是 JSON，但去掉 -H 或声明 text/plain。', '415；格式声明与契约不符。'],
      ['解析语法', '发送 { 或 {"watched":true,}。', '400；不能解析为 JSON。'],
      ['结构与类型', '发送 null、[]、episode:"1" 或 watched:"false"。', '400；JSON 合法但字段契约不满足。'],
      ['业务范围', 'aurora 第 13 集、unknown 第 1 集、episode:1.5。', '400；超出可信目录定义。'],
      ['体积', '正文超过 4096 bytes。', '413；不会写入 Set。']
    ]) + `<p><code>throw</code> 会中断当前正常流程，<code>try/catch</code> 负责接住异常。readJson 抛出的 status 是我们自己的对象字段，Node 不会自动把它变成状态码：async 函数抛错使 Promise 拒绝，调用处的 await 将拒绝作为异常抛入外层 catch，由 catch 调用 sendJson 发出 400 或 413。未知错误返回 500 和固定说明。若去掉 await，body 会是 Promise 而不是解析结果；若吞掉异常，客户端就拿不到正确的失败响应。</p><p><code>body?.animeId</code> 是可选链：body 为 null/undefined 时结果为 undefined，避免读取属性就抛错；它不完成校验。<code>Number.isInteger</code> 只接受数字整数，不自动接受字符串 "1"。<code>typeof … === "boolean"</code> 保证只有 true/false，避免字符串 "false" 因为非空而被当作真。前端写了 TypeScript 类型也无法改变网络正文，服务端仍必须检查。</p>` + answer('小实验：将 watched 改成字符串 "false"，再 GET，会怎样？', `<p>PUT 返回 400；再执行 <code>curl -i http://127.0.0.1:4310/api/watched</code>，仍然包含 aurora:1。所有校验发生在 add/delete 之前，所以失败请求不改变之前的有效状态。这是需要测试保护的数据约束，不只是错误文案。</p>`) },
    { title: '用集合描述写入：结果与重复执行', html: `<p>每次 createMemoryServer 调用创建一个 Set，回调通过闭包引用它。闭包意味着函数保留访问外层变量的能力：HTTP 回调结束后，这个 Set 仍可被下一条请求使用。若你把 <code>const watched = new Set()</code> 移到请求回调里面，每次请求都会重新得到空集合，刚写入的数据在下一次 GET 就看不见。</p>` + src(example('03-memory.mjs'), 30, 33) + src(example('03-memory.mjs'), 59, 62) + `<p>键是 <code>animeId + ":" + episode</code>，例如 aurora:1。合成 ID 固定且不含冒号，同一单集拥有稳定键。数组展开 <code>[...watched]</code> 把可迭代 Set 变成 JSON 能编码的数组。发送 true 表示把元素加入集合，发送 false 表示移除；不是“把当前值翻转一次”。</p>` + table(['动作', '用集合 W 表达', '从空集合连续做两次'], [
      ['watched:true', 'W′ = W ∪ {k}', '{k} → {k}'],
      ['watched:false', 'W′ = W ∖ {k}', '∅ → ∅'],
      ['若错误实现为 toggle', '存在则删、不存在则加', '{k} → ∅，最终结果变了']
    ]) + `<p>对相同请求重复应用，得到同样的目标状态，就是这里要用到的幂等性：f(f(W)) = f(W)。它不保证请求只执行一次，也不保证网络响应一定到达；它使一次重试不会把“标为已看”变成“取消已看”。是否允许自动重试还取决于整个接口的副作用与调用约定。</p><p>把上一节 PUT 原样发两次，然后 GET，应只有一个 aurora:1。再发一次 watched:false，随后 GET 应为空数组。此时请求得到了 200，只证明这次示例处理成功；没有任何一行代码把数据写到磁盘。</p>` },
    { title: '亲自证明数据寿命：刷新、重启和双实例', html: `<p>按顺序完成下表，每次写下“预测”和“实测”。实验开始时停止旧版本，启动 03，并写入 aurora:1。这个实验要区分浏览器状态、服务端内存和磁盘数据，不能只重复刷新页面。</p>` + table(['实验', '具体操作', '应该观察到'], [
      ['多次读取', '连续两次 curl GET /api/watched；也可在浏览器打开该地址再刷新。', '同一服务器进程仍返回 aurora:1。'],
      ['重启服务器', '终端 A Control-C，然后用同一条 03 命令启动，再 GET。', '返回 watched:[]；端口相同不会恢复旧进程的内存。'],
      ['两个实例', '给 4310 写入一集；另一个终端以 PORT=4311 启动 03，分别 GET 两个端口。', '4310 有一集，4311 为空；它们各有独立 Set。'],
      ['停止服务', '停止被访问端口的服务，再 curl --max-time 3。', '连接失败；没有 HTTP 404 或 500，因为没有服务接收请求。']
    ]) + code`# 在另一个终端启动第二个独立进程
PORT=4311 node teach/exercises/node-http/03-memory.mjs

# 比较两个地址
curl -i http://127.0.0.1:4310/api/watched
curl -i http://127.0.0.1:4311/api/watched` + `<p>你现在有一个反例：<strong>刷新仍在，不足以证明持久化；重启后仍在，才开始涉及更长寿命的存储。</strong>真实项目把账号与已看记录写入 DATA_DIR 的 SQLite 文件，因此相同目录重启可以恢复。换 DATA_DIR、挂载错误或容器没有持久化卷，也可能像“数据丢了”，实际上是读了另一份数据库。</p><p>当前生产方案是单实例。不能把“加一台机器就更快”直接套到进程内 Set，也不能让多个容器随意共享本地 SQLite 文件。先准确描述状态存在哪里、谁能写、如何保持一致，再讨论扩容。</p>` },
    { title: '制造故障，再按证据定位', html: `<p>下面故障都在 scratch 或本机合成数据上完成。一次只改变一个因素；看见报错后先判断它发生在启动、传输、路由、正文还是数据层，再改代码。这样能把“试着重启”变成可验证的诊断。</p>` + table(['制造方式', '证据', '解释与下一步'], [
      ['4310 已运行 03 时，再启动一个 01。', '新进程报告 EADDRINUSE；原来的端口仍能访问。', '新进程没绑定成功。lsof -nP -iTCP:4310 -sTCP:LISTEN 核对监听者；停止自己启动的进程或换 PORT，不随意 kill。'],
      ['scratch 将 response.end 改为 return 字符串。', 'curl --max-time 3 等待后超时。', '调用了函数但没完成 HTTP 响应；恢复 end。服务器进程活着并不等于请求已结束。'],
      ['02 用 request.url === "/api/anime" 判断路由。', '无参数 200，带 ?title=… 404。', '查询串被误当路径一部分；用 URL.pathname 分流。'],
      ['合法 JSON，episode 改成 "1"。', '400；GET 结果未变。', '应用在按类型契约拒绝输入，不是网络故障；修请求或明确重新设计契约。'],
      ['修改编号文件的响应文本，但不停止重启 node。', '新请求仍得到旧文本。', '这些裸 Node 命令没有启用热更新；当前进程仍运行已加载的代码。'],
      ['先写入，再停止重启第三版。', '200 与空数组。', '响应成功但新进程状态为空；检查存储寿命，不能把 200 当作数据内容正确。']
    ]) + `<p>浏览器中对应查看 Network：目标 URL、Request Method、状态、请求头、Request Payload、原始 Response。curl 则消除了前端按钮和 React 状态的影响。如果 curl 也失败，先查服务；如果 curl 成功而界面错，才继续查浏览器是否发了同样请求、是否处理了错误、是否把结果写入当前账号的状态。</p><p>本章示例的启动错误日志帮助定位端口；不要在真实项目中为了排查请求而输出密码、Cookie 或完整请求体。真实项目已有脱敏错误日志边界，后面的源码映射会解释。</p>` },
    { title: '回到番剧日历：Next 帮你接上了哪一层', html: `<p>现在打开真实项目 ${link('app/api/health/route.ts')}。Next 依据文件路径把 <code>GET /api/health</code> 交给导出的 GET 函数。这里没有手写 createServer/listen，因为启动与分流由框架承担。路由返回 Web Response 对象，框架负责将它转换成网络响应；这与裸 Node 必须调用 response.end 的回调约定不同。</p>` + table(['裸 Node 示例', '真实项目位置', '保留的概念与新增边界'], [
      ['createServer + if pathname', 'app/api/*/route.ts，导出 GET / PUT 等函数', '仍按路径和方法选择处理逻辑。'],
      ['sendJson(response, 200, value)', 'lib/server/http.js 的 privateJson()', '仍序列化响应；个人数据还需要 private/no-store 等缓存头。'],
      ['for await request + Buffer', 'lib/server/http.js 的 readJson()，读取 Web ReadableStream', '仍限字节数、收集、解析；对象 API 不同，不可逐字照搬。'],
      ['固定合成目录 + 参数校验', 'lib/anime-selections.js / lib/anime-episode-views.js', '服务端使用真实目录白名单与规范单集范围。'],
      ['闭包里的 Set', 'db/schema.ts + db/index.ts + DATA_DIR', '状态写入按账号隔离的数据库；提交成功后才返回写入结果。'],
      ['本章没有身份', 'app/auth.ts 与 requireSameOrigin()', '写请求先校验来源和会话，浏览器不能指定别人的邮箱。']
    ]) + `<p>沿着 ${link('app/api/anime-selections/route.ts')} 做一次代码阅读：先找到 requireSameOrigin，再找 getSessionUser，再找 readJson 与 filterKnownAnimeIds，最后找同步事务中的删除、分批插入与响应。<strong>事务包住整次替换</strong>，意味着中途插入失败不会只留下半份追番列表。先验证再变更的顺序与你刚才的 Set 示例相同，但事务提供了更强的失败原子性。</p><p>语义也要分清：本章 PUT 更新一个单集的目标状态；真实 /api/anime-selections 的 PUT 替换该账号的整个追番集合，逐集接口在 /api/anime-episode-views。不能仅凭同为 PUT 就交换两者的请求体。后者还处理批量单集校验、旧范围迁移和失败回滚，详见 ${link('app/api/anime-episode-views/route.ts')}。</p><p>示例 /health 固定返回 ok；真实 /api/health 会读取 SQLite 迁移表，数据库失败时返回 503。你已经可以解释为什么“服务监听成功”“健康接口成功”“某个账号的数据正确”是三个不同的验证问题。以下互动只模拟真实写请求的顺序，不会调用你的账号接口。</p><div data-widget="http"></div>` },
    ...original.sections.slice(1).map(section => ({ ...section, title: section.title.replace(/^\d+\.\s*/, '') })),
    { title: '独立作业：实现已看统计接口', html: `<p>现在离开逐步讲解。停止其它占用 4310 的示例，用编辑器打开 ${link(example('04-student.mjs'))}。它保留第三版读取、写入和校验，仅给 <code>GET /api/summary</code> 留了 TODO。你需要根据下面的契约写出实现，不能调用真实项目数据库，也不要修改测试来降低要求。</p>` + table(['契约', '期望'], [
      ['GET /api/summary', '200，正文恰为 {watchedAnimeCount: 非负整数, watchedEpisodeCount: 非负整数}。'],
      ['空集合', '{"watchedAnimeCount":0,"watchedEpisodeCount":0}。'],
      ['aurora:1、aurora:2、orbit:1', '{"watchedAnimeCount":2,"watchedEpisodeCount":3}；按已看过至少一集的作品去重。'],
      ['重复标记 aurora:1', '两个统计都不能增加。'],
      ['取消某作品的最后一个已看单集', '作品计数减少一；仅取消部分单集则作品数不变。'],
      ['POST /api/summary', '405，Allow: GET；GET 带查询串仍命中该路径。'],
      ['状态来源', 'GET 只读取，不改变已看集合；每次从当前 watched 推导，不另维护一份容易不同步的累计计数。']
    ]) + code`# 从项目根目录运行。测试自行分配端口，无需先启动服务。
node --test teach/exercises/node-http/assessment.test.mjs

# 手工核对时另行启动学生版
node teach/exercises/node-http/04-student.mjs
curl -i http://127.0.0.1:4310/api/summary` + `<p>第一次运行会出现失败，这是刻意的：TODO 当前返回 501（尚未实现）。你的目标是把它变为符合契约的 200。重点看断言中的 expected 与 actual、用例名字和响应内容，不要只盯着一串错误堆栈。测试导入学生文件的 createMemoryServer，因此保存修改后重跑即可；手动启动的服务需要重启才加载新代码。</p>` + answer('提示一：两个统计分别对应什么集合？', `<p>设 W 是单集键集合。单集数是 |W|；作品数是 |{ animeId(k) : k ∈ W }|。合成 ID 都不含冒号，可以按冒号分隔取出第一项，再用 Set 去重。遍历 W 的复杂度是 O(|W|)，无需额外长期保存两个计数器。</p>`) + answer('提示二：实现应该放哪里？', `<p>在已有 /api/summary 分支替换 TODO 的 501 返回。该分支已经位于方法检查之后，因此保留当前路由框架即可。返回值要是数字，不是字符串；用现有 sendJson 完成响应。</p>`) + answer('提交自己的实现记录之后，再打开参考答案', `<p>${link(example('05-solution.mjs'))} 是单独的参考文件，不会自动写回你的作业。运行下面的命令只验证参考答案，<strong>不代表学生版本通过</strong>。最终仍须不带环境变量运行 assessment。</p>` + code`NODE_HTTP_SOLUTION=1 node --test teach/exercises/node-http/assessment.test.mjs`) },
    { title: '理解测试在证明什么，以及没有证明什么', html: `<p>运行示例回归，并打开测试源码找出请求是在哪里真正发出的：</p>` + code`node --test teach/exercises/node-http/examples.test.mjs` + `<p>测试会导入 01–03 的创建函数、在回环地址分配临时端口、发真实 HTTP 请求，最后关闭服务。它们验证初版任意路径响应、查询与方法分流、JSON 语法与字段校验、分次写入的正文、失败后状态不变、实例间隔离和新实例为空。监听临时端口不要求你预先腾出 4310。</p><p>看测试时，把每个用例翻译成三句话：“初始状态是什么 → 做了哪些动作 → 断言什么结果”。例如先写入 aurora:1，再发 episode:13，再 GET，断言只有原来那一集，才验证了非法写入不污染有效状态。仅断言返回 400，还不足以排除服务已经先写坏数据再报错。</p><p>查看 ${link(example('examples.test.mjs'))} 与 ${link(example('assessment.test.mjs'))}。这两组检查职责不同：examples 验证教材给出的例子；assessment 默认验收你修改的 04。参考答案全绿、示例全绿，都不能替代你自己的实现通过。</p><p>自动测试覆盖的是已列举的契约，没有证明能安全公网部署、支持多用户或永久保存。重启生命周期既有新实例的自动检查，也应做上一节的实际 Control-C 实验。还应自己补一个反例，例如两集都属于 comet 时作品数只能为一；说明这个反例针对哪种错误实现。</p>` },
    { title: '本章口头验收：能解释到哪一步', html: `<p>把浏览器和答案收起来，先用自己的话回答，再逐条展开对照。如果只能复述名词，回到对应实验再运行一次；如果能够预测并解释反例，就可以继续下一章。</p>` + answer('1. 为什么 return {ok:true} 在裸 Node 和 Next 路由里不等价？', `<p>裸 Node 回调的普通返回值不会自动被序列化，必须操作 response 并 end。Next 路由按框架约定返回 Response（例如 Response.json({ok:true})）；也不是任意普通对象都会自动成为响应。调用约定不同，HTTP 输出这一目标相同。</p>`) + answer('2. 为什么一次 JSON 请求不能在第一个字节块到达时就解析？', `<p>请求可能被分块，JSON 结构甚至 UTF-8 字符都可能跨块。要在字节上限内收集完整正文、解码、解析，再校验字段和业务范围。不能把一块字节等同于一条业务消息。</p>`) + answer('3. 为什么 watched:"false" 必须拒绝，watched:false 可以接受？', `<p>前者是非空字符串，在条件判断中为真；后者是布尔值。若不检查类型，用 if(body.watched) 就会把用户以为的取消变为添加。协议明确要求布尔值，服务端必须以实际网络输入为准。</p>`) + answer('4. 为什么 200、页面刷新仍在、重启仍在是三种证据？', `<p>200 是本次响应的成功状态；刷新验证后续请求能否读取当前服务状态；重启验证状态是否具有超过该进程的寿命。内存示例满足前两项而不满足第三项；真实 SQLite 还要核对重启使用了同一数据目录。</p>`) + answer('5. 统计接口为何应当从 watched 推导，而不是每次写入 count++？', `<p>重复 PUT 应保持目标状态不变。count++ 会把重复请求算成新单集；取消、最后一集、非法请求等分支也会让计数器与集合分离。当前数据规模下直接从可信集合推导更简单，成本 O(|W|)，用测试验证去重和移除边界。</p>`) + `<p>最后写一份简短实验记录：三个版本的启动命令与实际状态码、一条自己制造的错误及定位证据、学生作业测试结果、重启前后结果、真实路由与示例的一一对应。遇到不会解释的部分，把它当作明确的下一步学习任务。</p>` }
  ];
  window.TEACH.lessons[index] = {
    ...original, deep: true, prerequisites: '函数、数组、集合；本章随用随解释 JavaScript 语法',
    nav: 'Node + HTTP：从零写接口', title: 'Node 与 HTTP：从零写出一个服务',
    subtitle: '深入样板 · 逐步推导、真实请求、失败实验与独立作业', time: '深入样板 · 约 5–8 小时，建议分 3 次',
    tags: ['回调与进程', 'HTTP / JSON', '路由与校验', '数据寿命', '真实 HTTP 验收'],
    lead: '以你的算法基础为起点，先亲手写一个服务器，再把它扩成可查询、可写入的接口。每一步都观察请求、解释代码、构造反例，最后回到番剧日历的 Next 与 SQLite。',
    sections: sections.map((section, i) => ({ ...section, title: `${i + 1}. ${section.title}` })),
    quiz: {
      question: 'PUT 返回 200，刷新还能读到已看记录，但同端口重启后为空。哪些解释最符合第三版的实际代码？',
      options: ['端口没有保存上一份请求，改成固定端口即可持久化', 'Set 属于旧服务器实例；刷新仍访问它，重启创建了新 Set', 'GET 自动清空了上一次 PUT 的响应正文，因此需要改成 POST'],
      answer: 1, explanation: '第三版没有磁盘写入，状态属于 createMemoryServer 创建的 Set。HTTP 成功与端口相同不延长内存寿命；真实项目通过同一 DATA_DIR 内的 SQLite 文件实现跨进程重启保存。'
    },
    task: '<h3>达到“能独立写、能解释失败”</h3><ol><li>独立完成 remaining 查询，展示合法零值、缺参数、越界与错误方法的实际响应。</li><li>不参考 05，完成 04 的统计接口；默认 assessment 测试全部通过，并自己增加或手工验证一个边界反例。</li><li>解释正文分块、布尔值校验、重复 PUT、进程重启四个实验。</li><li>按前面的隔离目录步骤启动真实项目，指认来源校验、身份、数据校验、事务与响应，区分 dev/build/start。</li></ol><p><strong>验收：</strong>保留真实输出与自己的解释。完成按钮只记录自评；示例通过或参考答案通过不能代替学生作业。完成这章意味着掌握本章的服务与请求基础，还需要后续 React、数据库与维护训练才能运营整个项目。</p>',
    resources: [
      { title: 'Node：HTTP API 与请求 / 响应对象', url: 'https://nodejs.org/api/http.html' },
      { title: 'Node：Buffer 与字节', url: 'https://nodejs.org/api/buffer.html' },
      { title: 'Node：URL 与 URLSearchParams', url: 'https://nodejs.org/api/url.html' },
      { title: 'MDN：HTTP 概览', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview' },
      ...original.resources
    ]
  };
})();
