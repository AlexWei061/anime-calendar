/* Isolated, deterministic teaching implementations. No account or project API writes. */
(() => {
  const escape = (value) => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pad = n => String(n).padStart(2,'0');
  function broadcast(date,time,fixed=true) {
    const [hour,minute]=time.split(':').map(Number);
    const minutes=hour*60+minute;
    const previous=fixed?minutes<300:minutes<=300;
    const day=new Date(date+'T00:00:00Z');
    if(previous)day.setUTCDate(day.getUTCDate()-1);
    return {date:day.toISOString().slice(0,10),time:`${pad(hour+(previous?24:0))}:${pad(minute)}`,originalDate:date,originalTime:time};
  }
  function normalize(value,fixed=true) { return (fixed?value.normalize('NFKC'):value).toLowerCase().replace(/\s+/g,''); }
  function watchedKey(animeId,episode,fixed=true) { return fixed?`${animeId}:${episode}-${episode}`:animeId; }
  function queueCount(current,functional) { let next=current;for(let i=0;i<3;i++)next=functional?next+1:current+1;return next; }
  function lanes(events,duration=30) {
    const sorted=[...events].sort((a,b)=>a.start-b.start);
    const groups=[];
    for(const event of sorted){const last=groups.at(-1);if(!last||event.start>=last.end)groups.push({end:event.start+duration,events:[event]});else{last.end=Math.max(last.end,event.start+duration);last.events.push(event);}}
    return groups.flatMap(group=>{const ends=[];const positioned=group.events.map(event=>{let lane=ends.findIndex(end=>end<=event.start);if(lane<0)lane=ends.length;ends[lane]=event.start+duration;return {...event,lane};});return positioned.map(event=>({...event,laneCount:ends.length}));});
  }
  function bugResults(kind,fixed) {
    if(kind==='midnight')return [
      {label:'04:59 应属于 7 月 31 日',actual:broadcast('2026-08-01','04:59',fixed).date,expected:'2026-07-31'},
      {label:'05:00 应属于 8 月 1 日',actual:broadcast('2026-08-01','05:00',fixed).date,expected:'2026-08-01'}
    ];
    if(kind==='search')return [
      {label:'ASCII 大小写应匹配',actual:normalize('BanG Dream',fixed).includes(normalize('BANG',fixed)),expected:true},
      {label:'全角英文应匹配',actual:normalize('BanG Dream',fixed).includes(normalize('ｂａｎｇ',fixed)),expected:true}
    ];
    return [
      {label:'不同番剧应有不同键',actual:watchedKey('alpha',1,fixed)!==watchedKey('beta',1,fixed),expected:true},
      {label:'同一番不同集应有不同键',actual:watchedKey('alpha',1,fixed)!==watchedKey('alpha',2,fixed),expected:true}
    ];
  }
  const widget = (label,title,body) => `<div class="widget"><span class="widget-label">${label}</span><h3>${title}</h3>${body}</div>`;
  const requestScenarios = [
    {id:'ok',label:'200 · 正常保存'},
    {id:'unauthorized',label:'401 · 缺少有效会话'},
    {id:'origin',label:'403 · Origin 不匹配'},
    {id:'invalid',label:'400 · animeIds 类型错误'},
    {id:'limited',label:'429 · 登录尝试过于频繁'},
    {id:'failed',label:'500 · 事务中插入失败'}
  ];
  function requestTrace(scenario='ok') {
    if(!requestScenarios.some(item=>item.id===scenario)) throw new RangeError('Unknown request scenario');
    const before=['saved-anime'],wanted=['saved-anime','demo'];
    const login=scenario==='limited';
    const method=login?'POST':'PUT';
    const path=login?'/api/auth/login':'/api/anime-selections';
    const steps=[];
    let database=[...before],ui=login?[...before]:[...wanted];
    const push=(id,title,detail,extra={})=>steps.push({id,title,detail,status:null,database:[...database],ui:[...ui],transaction:'未开始',...extra});
    const respond=(status,detail,extra={})=>{
      if(status!==200)ui=[...before];
      push('response','响应到达浏览器',detail,{status,...extra});
    };
    push('client',login?'准备登录':'点击追番，先乐观更新',login?'这是登录路由的限流分支；没有修改追番 UI。':'UI 先出现 demo。SQLite 的旧列表仍是 [saved-anime]；此时还不能说保存成功。');
    const body=scenario==='invalid'?'{"animeIds":[123]}':'{"animeIds":["saved-anime","demo"]}';
    push('request',`${method} ${path}`,login?'只展示占位的登录请求，不包含真实邮箱、密码或 Cookie。':`Content-Type: application/json。请求体：${body}。同源 fetch 会携带浏览器保存的会话 Cookie；请求体不能指定账号身份。`);
    if(scenario==='origin') {
      push('origin','requireSameOrigin 拒绝来源','Origin=https://other.example 与 APP_ORIGIN=https://calendar.example 不同。停止执行；会话、请求体、数据库均未处理。');
      respond(403,'HTTP 403 返回后 UI 回滚。先检查实际访问来源与可信配置；绕开来源校验不能修好配置错误。');
    } else {
      push('origin','requireSameOrigin 通过','Origin 与 APP_ORIGIN 精确匹配。来源检查只说明请求来自允许的站点，不代表用户已经登录。');
      if(login) {
        push('limit','limitAuth 触发限制','POST /api/auth/login 在读取请求体前检查全局／客户端限流；本样本已有过多尝试，后续密码与数据库步骤跳过。');
        respond(429,'HTTP 429，Retry-After: 60（教学样本）。等待指定秒数后再尝试。追番 PUT 路由没有此限流步骤。',{retryAfter:60});
      } else if(scenario==='unauthorized') {
        push('session','getSessionUser 没有找到用户','会话 Cookie 缺失、过期或无效，getSessionUser() 返回 null。请求体校验与事务步骤跳过。');
        respond(401,'HTTP 401 到达后恢复旧 UI，并提示用户重新登录。修改请求体里的 email 不能获得其他账号身份。');
      } else {
        push('session','getSessionUser 确认身份','服务器验证会话令牌哈希与有效期后取得 user.email。数据库查询和写入都限定在这个账号。');
        if(scenario==='invalid') {
          push('validation','readJson → filterKnownAnimeIds 拒绝数据','本情景请求体为 {"animeIds":[123]}。animeIds 必须是字符串数组；数字触发 TypeError，invalidRequest 转为 400。事务未开始。');
          respond(400,'HTTP 400 到达后恢复旧 UI。未知字符串 ID 会被过滤，重复 ID 会去重；它们与本例的类型错误不同。');
        } else {
          push('validation','readJson → filterKnownAnimeIds 通过','检查 JSON 类型与体积后，只保留目录内的稳定 ID 并去重。本实验把 saved-anime 与 demo 当作合法占位 ID。');
          if(scenario==='failed') {
            push('transaction','db.transaction：删除后插入抛错','同步回调已执行 tx.delete(...).run()，但 tx.insert(...).run() 抛错；SQLite 回滚整个事务，旧列表 [saved-anime] 仍在。UI 暂时仍是乐观值。',{transaction:'已回滚'});
            respond(500,'服务端记录脱敏操作名与错误码；HTTP 500 到达后 UI 回滚。数据库和 UI 的回滚发生在各自的边界。',{transaction:'已回滚'});
          } else {
            database=[...wanted];
            push('transaction','db.transaction：同步执行并提交','在同一个同步回调中 tx.delete(...).run()，再按每批 50 条 tx.insert(...).run()；没有 await。回调成功结束后一次性提交。此时 HTTP 响应尚未到达。',{transaction:'已提交'});
            respond(200,'privateJson 返回保存后的 animeIds。HTTP 200 到达后 UI 保留 demo；数据库与 UI 一致。',{transaction:'已提交'});
          }
        }
      }
    }
    return {scenario,method,path,steps};
  }
  let widgetSequence=0;
  function mountRequest(el,expanded=false) {
    const id=`trace-scenario-${++widgetSequence}`;
    const scenarios=expanded?requestScenarios:requestScenarios.filter(item=>['ok','unauthorized','failed'].includes(item.id));
    el.innerHTML=widget(expanded?'HTTP BOUNDARIES / 单步实验':'REQUEST TRACE / 单步模拟',expanded?'先预测状态码，再检查请求在哪一层停下':'跟随一次追番，分清数据库提交与界面确认',`<p class="subtle">完全隔离的确定性模拟，不发真实请求，不执行 SQL，不修改账号。列表中的 ID 都是教学占位符。</p><div class="widget-controls"><label for="${id}">请求情景</label><select id="${id}">${scenarios.map(item=>`<option value="${item.id}">${item.label}</option>`).join('')}</select><button type="button" data-next>下一步 →</button><button type="button" data-reset>从头推演</button></div><p data-endpoint></p><div class="step-list" role="list" aria-label="请求经过的步骤"></div><div class="terminal" aria-live="polite" aria-atomic="true"></div><details><summary>与真实代码对照：同步事务</summary><pre>const db = await getDb();
db.transaction((tx) =&gt; {
  tx.delete(animeSelections).where(/* 当前 user.email */).run();
  for (const batch of selectionInsertBatches(animeIds)) {
    tx.insert(animeSelections).values(/* 当前账号与 batch */).run();
  }
});</pre><p class="subtle">上面只省略了查询条件和行对象的细节。真实代码在 app/api/anime-selections/route.ts；异步身份、请求体读取在事务之外，回调内语句必须显式执行。</p></details>`);
    const select=el.querySelector('select');
    let trace,step;
    const update=()=>{
      const current=trace.steps[step];
      el.querySelector('[data-endpoint]').textContent=`${trace.method} ${trace.path}${trace.scenario==='limited'?' · 登录接口情景（追番接口没有 limitAuth）':''}`;
      el.querySelector('.step-list').innerHTML=trace.steps.slice(0,step+1).map((item,index)=>`<div class="step-item ${index===step?'current':''}" role="listitem" ${index===step?'aria-current="step"':''}><div><strong>${escape(item.title)}</strong><p>${escape(item.detail)}</p></div></div>`).join('');
      el.querySelector('.terminal').textContent=`第 ${step+1} / ${trace.steps.length} 步：${current.title}\nUI 列表 = ${JSON.stringify(current.ui)}\nSQLite 已提交的列表 = ${JSON.stringify(current.database)}\n事务状态 = ${current.transaction}\n浏览器收到的 HTTP 状态 = ${current.status??'尚未收到响应'}${current.retryAfter?`\nRetry-After = ${current.retryAfter} 秒`:''}${current.status?'\n个人数据响应：Cache-Control: private, no-store；Vary: Cookie':''}\n\n${current.detail}`;
      el.querySelector('[data-next]').disabled=step===trace.steps.length-1;
    };
    const reset=()=>{trace=requestTrace(select.value);step=0;update();};
    select.addEventListener('change',reset);
    el.querySelector('[data-next]').addEventListener('click',()=>{step=Math.min(step+1,trace.steps.length-1);update();});
    el.querySelector('[data-reset]').addEventListener('click',reset);
    reset();
  }
  const incidentCases=[
    {
      id:'dns',title:'01 · 域名打不开，容器却健康',
      context:'刚换服务器。只有部分网络访问失败。预期公网 IP 是 203.0.113.20（教学保留地址）。',
      evidence:['DNS 查询：calendar.example A → 203.0.113.9；AAAA → 无记录','docker compose ps：app healthy；caddy running','在 app 容器内请求 http://127.0.0.1:3000/api/health：200'],
      roots:[
        {text:'DNS A 记录仍指向旧服务器',correct:true,feedback:'对。DNS 解析值与预期公网 IP 不同，浏览器请求还没有到新服务器。'},
        {text:'React 的组件没有重新渲染',feedback:'域名解析发生在加载 React 之前，组件无法修复一个指向旧 IP 的域名。'},
        {text:'SQLite 没有保存追番记录',feedback:'当前证据是目标地址错误，并且新服务的数据库健康检查已经通过。'}
      ],
      actions:[
        {text:'先删除 SQLite，再重建镜像',feedback:'这既不改变 DNS，又会危及真实数据。健康检查没有提示数据库损坏。'},
        {text:'核对并修改 DNS A 记录，等待 TTL 后从故障网络重新解析和访问',correct:true,feedback:'对。核对 A／AAAA 指向，观察 TTL；再用受影响网络验证 HTTPS 与健康接口，才算问题关闭。'},
        {text:'公开应用的 3000 端口作为长期入口',feedback:'直接开放应用端口不会改变域名解析，并且绕过了 Caddy 的 HTTPS 与代理边界。'}
      ],
      verify:'验收：故障网络解析到预期 IP，HTTPS 证书有效，域名下 /api/health 返回 200；再确认页面与登录。'
    },
    {
      id:'origin',title:'02 · 页面正常，点追番却是 403',
      context:'刚将域名从 old.example 切换到 calendar.example。读页面正常，所有写操作失败。',
      evidence:['浏览器 Network：PUT /api/anime-selections → 403；error = Request origin is not allowed','请求 Origin：https://calendar.example；容器 APP_ORIGIN：https://old.example','GET /api/health → 200'],
      roots:[
        {text:'会话过期，所以一定返回 403',feedback:'这个错误明确来自 requireSameOrigin；本项目会话无效时返回 401。来源检查早于会话读取。'},
        {text:'浏览器 Origin 与服务器 APP_ORIGIN 不一致',correct:true,feedback:'对。页面可读取不能证明写请求配置正确，Origin 必须与可信的公开来源精确匹配。'},
        {text:'追番表缺少索引',feedback:'来源校验已拒绝请求，还没有进入业务数据库事务。'}
      ],
      actions:[
        {text:'把请求体里的 email 改成自己邮箱',feedback:'身份由会话确定，并且请求尚未到身份步骤；email 字段不能修正来源配置。'},
        {text:'删除 requireSameOrigin，让所有请求通过',feedback:'这会移除写入边界。证据指向配置错误，应修正可信来源。'},
        {text:'核对 SITE_DOMAIN 与实际生效的 APP_ORIGIN，更新配置并重建应用容器',correct:true,feedback:'对。Compose 从 SITE_DOMAIN 注入 APP_ORIGIN；环境变化要让容器重新创建生效，再验证读写。'}
      ],
      verify:'验收：容器的 APP_ORIGIN 为正确 HTTPS 来源，合法追番写入成功并能刷新保留，错误 Origin 仍返回 403。'
    },
    {
      id:'storage',title:'03 · 首次启动就不健康',
      context:'首次部署，宿主机 storage/ 是刚由 root 创建的目录，还没有正式用户数据。',
      evidence:['docker compose ps：app unhealthy','应用启动日志摘要：数据目录访问失败，EACCES','宿主机 storage/：owner root:root，mode 700；应用镜像运行 UID 1000'],
      roots:[
        {text:'宿主机挂载目录不允许容器 UID 1000 写入',correct:true,feedback:'对。bind mount 覆盖了镜像内预建目录的权限；root 拥有的 700 目录不会自动归容器用户所有。'},
        {text:'缺少 DNS AAAA 记录',feedback:'本地启动写目录已经失败；IPv6 解析不能改变容器文件权限。'},
        {text:'健康检查太严格，应该只检查进程存在',feedback:'健康接口实际读数据库是必要证据。放松检查会把不可用的应用伪装成健康。'}
      ],
      actions:[
        {text:'把 storage/ 放进 public/ 方便访问',feedback:'数据库与私有头像不能成为公开静态资源，这也没有正确解决运行用户权限。'},
        {text:'确认目标目录后按部署文档设为 1000:1000、700，再启动并查健康',correct:true,feedback:'对。只处理确认过的 storage/、backups/ 挂载目录；用与镜像一致的 UID 和最小必要权限。'},
        {text:'将项目所有目录递归 chmod 777',feedback:'这扩大了写权限且掩盖根因；应精确处理持久化目录与实际运行用户。'}
      ],
      verify:'验收：数据目录可写，app 变为 healthy，/api/health 实际读取 SQLite 成功；创建测试账号后重启容器，数据仍在。'
    },
    {
      id:'upstream',title:'04 · HTTPS 有锁，页面返回 502',
      context:'Caddy 容器运行中。应用刚升级，随后停止。下面是固定样本，不是当前服务器日志。',
      evidence:['浏览器：https://calendar.example → 502；TLS 证书校验通过','Caddy 日志摘要：dial tcp app:3000: connect: connection refused','docker compose ps：app exited；caddy running'],
      roots:[
        {text:'证书没有续期',feedback:'TLS 校验已经通过；502 是代理连不上上游后的 HTTP 响应。'},
        {text:'用户没有登录',feedback:'无会话的个人 API 应返回 401；当前代理连应用进程都没有连上。'},
        {text:'上游应用进程退出，Caddy 无法连接 app:3000',correct:true,feedback:'对。可以确定故障层在应用可用性；进程为何退出还需要应用日志，不能仅凭 502 判断数据库损坏。'}
      ],
      actions:[
        {text:'先查 app 退出日志与配置，定位启动失败；修复后核对进程和健康',correct:true,feedback:'对。先取得退出原因，再做针对修复；必要时回退已验证镜像前，还要检查数据库 schema 兼容性。'},
        {text:'清空 Caddy 证书卷并重新申请证书',feedback:'证书和 HTTPS 已正常，清空卷不会让 app:3000 出现监听进程。'},
        {text:'只重启 Caddy，就把问题标记为解决',feedback:'重启代理不能证明上游恢复；必须检查 app 的启动原因与实际健康状态。'}
      ],
      verify:'验收：app 持续运行且 healthy，域名下健康检查为 200，页面和追番写入恢复；保留退出原因与修复记录。'
    },
    {
      id:'restore',title:'05 · 备份目录存在，但恢复失败',
      context:'你把一份备份复制到另一台机器做恢复演练，使用一个尚不存在的新目标目录。',
      evidence:['备份 manifest.json：包含数据库和一个当前头像的文件清单及 SHA-256','恢复校验：数据库通过；avatars/.../version.webp 找不到','线上服务仍健康；原 storage/ 未被修改'],
      roots:[
        {text:'备份副本缺少清单引用的头像，不能证明可恢复',correct:true,feedback:'对。目录存在或数据库能打开都不够；本项目备份必须同时包含快照所引用的头像与校验清单。'},
        {text:'所有用户的密码哈希都已损坏',feedback:'证据只显示缺失头像，没有密码哈希损坏的证据。'},
        {text:'恢复脚本应该跳过所有校验',feedback:'校验正是在阻止交付不完整状态；关闭校验会把缺文件带入正式服务。'}
      ],
      actions:[
        {text:'先覆盖线上 storage/，再看哪些头像丢失',feedback:'演练已经失败，不应把未验证的数据覆盖到线上。旧库应继续保留。'},
        {text:'在 manifest 中删掉缺文件记录，让校验通过',feedback:'这会伪造完整性。清单必须对应真实快照，不能为了通过而删掉证据。'},
        {text:'核查原备份与传输完整性，重新复制或生成完整备份，再恢复到新目录',correct:true,feedback:'对。优先判断传输遗漏还是原备份失败；完整复制数据库、头像、清单，并在新目录重新验证。'}
      ],
      verify:'验收：全部文件校验通过，恢复到新目录后用测试实例验证账号、追番、已看和头像；旧会话被撤销，需重新登录。'
    }
  ];
  function evaluateIncident(id,rootChoice,actionChoice) {
    const incident=incidentCases.find(item=>item.id===id);
    if(!incident)throw new RangeError('Unknown incident');
    if(!Number.isInteger(rootChoice)||!Number.isInteger(actionChoice))throw new RangeError('Choices must be integer indexes');
    const root=incident.roots[rootChoice],action=incident.actions[actionChoice];
    if(!root||!action)throw new RangeError('Choose one root and one action');
    const rootCorrect=!!root.correct,actionCorrect=!!action.correct;
    return {rootCorrect,actionCorrect,correct:rootCorrect&&actionCorrect,rootFeedback:root.feedback,actionFeedback:action.feedback,verification:incident.verify};
  }
  function mountIncident(el) {
    const id=`incident-case-${++widgetSequence}`;
    el.innerHTML=widget('INCIDENT DESK / 从证据定位故障','先确定故障层，再选择下一步',`<p class="subtle">所有证据都是固定教学样本。这里不会执行命令、连接服务器或更改文件。</p><div class="widget-controls"><label for="${id}">故障案例</label><select id="${id}">${incidentCases.map(item=>`<option value="${item.id}">${escape(item.title)}</option>`).join('')}</select></div><div data-incident-body></div>`);
    const select=el.querySelector('select');
    const render=()=>{
      const incident=incidentCases.find(item=>item.id===select.value);
      el.querySelector('[data-incident-body]').innerHTML=`<p>${escape(incident.context)}</p><h3>已收集的证据</h3><div class="terminal" aria-label="固定的故障证据">${incident.evidence.map((line,i)=>`${i+1}. ${escape(line)}`).join('\n\n')}</div><form class="quiz" data-incident-answer><fieldset><legend>这些证据最直接支持哪个根因？</legend>${incident.roots.map((choice,i)=>`<label><input type="radio" name="incident-root" value="${i}" required>${escape(choice.text)}</label>`).join('')}</fieldset><fieldset><legend>接下来最合理的动作是什么？</legend>${incident.actions.map((choice,i)=>`<label><input type="radio" name="incident-action" value="${i}" required>${escape(choice.text)}</label>`).join('')}</fieldset><button type="submit">检查我的判断</button><div class="feedback" aria-live="polite" aria-atomic="true"></div></form>`;
      const form=el.querySelector('form');
      form.addEventListener('submit',event=>{
        event.preventDefault();
        const root=form.querySelector('[name="incident-root"]:checked'),action=form.querySelector('[name="incident-action"]:checked');
        const feedback=form.querySelector('.feedback');
        if(!root||!action){feedback.textContent='请分别选择一个根因和一个下一步动作。';return;}
        const result=evaluateIncident(incident.id,Number(root.value),Number(action.value));
        feedback.className=`feedback ${result.correct?'':'wrong'}`;
        feedback.innerHTML=`<p><strong>${result.correct?'判断与处置都正确。':'还有证据需要对齐。'}</strong></p><p>根因：${escape(result.rootFeedback)}</p><p>下一步：${escape(result.actionFeedback)}</p><p>${escape(result.verification)}</p>`;
      });
      form.addEventListener('change',()=>{const feedback=form.querySelector('.feedback');feedback.className='feedback';feedback.textContent='判断已修改，请重新检查。';});
    };
    select.addEventListener('change',render);
    render();
  }
  function mount(root) {
    root.querySelectorAll('[data-widget]').forEach(el=>{
      const type=el.dataset.widget;
      if(type==='search'){
        el.innerHTML=widget('TRY THE FUNCTION','输入查询词，看到实际的标准化结果','<label for="search-query">示例作品：BanG Dream! YUME∞MITA / バンドリ！ ゆめ∞みた</label><div class="widget-controls"><input id="search-query" value="ｂａｎｇ" type="text"><button data-sample>试试日文</button></div><div class="terminal" aria-live="polite"></div><p class="subtle">教学固定样本；使用与真实搜索相同的标准化规则。</p>');
        const input=el.querySelector('input');
        const update=()=>{const query=normalize(input.value);const result=['BanG Dream! YUME∞MITA','バンドリ！ ゆめ∞みた'].some(t=>normalize(t).includes(query));el.querySelector('.terminal').textContent=`N(query) = ${JSON.stringify(query)}\nmatchesAnimeTitle = ${result}\n${query?'两种标题中存在子串匹配即可。':'算法返回 true；真实页面另有空查询提示。'}`;};
        input.addEventListener('input',update);el.querySelector('button').addEventListener('click',()=>{input.value='ゆめ';update();});update();
      }
      if(type==='state'){
        el.innerHTML=widget('STATE TRANSITION / 教学模拟','连续三次更新，结果一定是 +3 吗？','<p class="subtle">下面模拟 React 更新队列的关键语义，不是在此教材中运行 React。</p><div class="math-output" aria-live="polite">count = <span data-count>0</span></div><div class="actions"><button data-update="snapshot">setCount(count + 1) × 3</button><button data-update="functional">setCount(n ⇒ n + 1) × 3</button><button data-reset>重置</button></div><div class="terminal" aria-live="polite">先预测，再点击。</div>');
        let count=0;
        el.querySelectorAll('[data-update]').forEach(button=>button.addEventListener('click',()=>{const old=count;const functional=button.dataset.update==='functional';count=queueCount(count,functional);el.querySelector('[data-count]').textContent=count;el.querySelector('.terminal').textContent=functional?`旧 count = ${old}\n更新依次消费前一个结果：${old} → ${old+1} → ${old+2} → ${count}`:`这一轮闭包里的 count 都是 ${old}\n三次请求都把下一值设为 ${old+1}\n下一次渲染：count = ${count}`;}));
        el.querySelector('[data-reset]').addEventListener('click',()=>{count=0;el.querySelector('[data-count]').textContent='0';el.querySelector('.terminal').textContent='已重置。';});
      }
      if(type==='midnight'){
        el.innerHTML=widget('PIECEWISE FUNCTION','拖动时间，观察 05:00 处的分段','<div class="widget-controls"><label for="broadcast-date">真实日期</label><input type="date" id="broadcast-date" value="2026-08-01"><label for="broadcast-minute">时间（0–360 分钟）</label><input type="range" id="broadcast-minute" min="0" max="360" value="299"><button data-time="0">00:00</button><button data-time="299">04:59</button><button data-time="300">05:00</button></div><div class="output-grid" aria-live="polite"><div class="output-card"><strong>真实播出</strong><span data-original></span></div><div class="output-card"><strong>周历位置</strong><span data-layout></span></div></div><div class="terminal" aria-live="polite"></div>');
        const date=el.querySelector('input[type=date]'),range=el.querySelector('input[type=range]');
        const update=()=>{if(!date.value){el.querySelector('.terminal').textContent='请选择一个有效日期。';return;}const minutes=Number(range.value),time=`${pad(Math.floor(minutes/60))}:${pad(minutes%60)}`,out=broadcast(date.value,time);el.querySelector('[data-original]').textContent=`${date.value} ${time}`;el.querySelector('[data-layout]').textContent=`${out.date} 栏 · ${minutes<300?'次日 ':''}${time}`;el.querySelector('.terminal').textContent=`t = ${minutes} 分钟\nt < 300 → ${minutes<300}\n轴内时刻 = ${out.time}；原始 broadcastDate 始终保留`;} ;
        date.addEventListener('input',update);range.addEventListener('input',update);el.querySelectorAll('[data-time]').forEach(b=>b.addEventListener('click',()=>{range.value=b.dataset.time;update();}));update();
      }
      if(type==='lanes'){
        el.innerHTML=widget('INTERVAL PARTITIONING','移动 C，看它何时能复用 A 的栏','<p class="subtle">A 20:00，B 20:15，C 可调；视觉区间长 30 分钟。图示纵轴从 20:00 开始。</p><div class="widget-controls"><label for="lane-start">C 的开始时间</label><input type="range" id="lane-start" min="1200" max="1260" step="5" value="1220"><output></output></div><div class="lane-demo" aria-label="三张卡片的区间分栏示意"></div><div class="terminal" aria-live="polite"></div>');
        const input=el.querySelector('input');const update=()=>{const start=Number(input.value);el.querySelector('output').textContent=`${pad(Math.floor(start/60))}:${pad(start%60)}`;const rows=lanes([{name:'A',start:1200},{name:'B',start:1215},{name:'C',start}]);el.querySelector('.lane-demo').innerHTML=rows.map(r=>`<div class="lane-card" style="top:${(r.start-1200)*2.2}px;left:${r.lane/r.laneCount*100}%;width:${100/r.laneCount}%;height:66px">${r.name} · ${pad(Math.floor(r.start/60))}:${pad(r.start%60)}<br>lane ${r.lane}</div>`).join('');el.querySelector('.terminal').textContent=rows.map(r=>`${r.name}: [${r.start}, ${r.start+30})  lane=${r.lane}, laneCount=${r.laneCount}`).join('\n')+'\n栏宽 = 100% / laneCount；end ≤ start 可以复用。';};input.addEventListener('input',update);update();
      }
      if(type==='request'||type==='http') mountRequest(el,type==='http');
      if(type==='incident') mountIncident(el);
      if(type==='bug-labs'){
        const labs=[
          {id:'midnight',title:'01 / 05:00 被挪到了昨天',symptom:'04:59 正常，05:00 却显示在前一天。哪些样例能区分 < 与 ≤？',bad:'if (minutes <= 5 * 60) { /* 显示日减一 */ }',good:'if (minutes < 5 * 60) { /* 显示日减一 */ }',why:'规格是 [00:00, 05:00)，右端点不包含。修边界条件，不要特判某一天。'},
          {id:'search',title:'02 / 全角英文搜不到',symptom:'BANG 可以匹配，ｂａｎｇ 不行。问题是资料缺失，还是字符标准化？',bad:'value.toLowerCase().replace(/\\s+/g, "")',good:'value.normalize("NFKC").toLowerCase().replace(/\\s+/g, "")',why:'标题与查询都要采用同一套标准化；只给某个查询词加特例不是根因修复。'},
          {id:'watched',title:'03 / 看完第 1 集，第 2 集也像看过了',symptom:'同一番不同集得到了相同的存储键。这是 UI 颜色问题还是身份定义错误？',bad:'return animeId;',good:'return animeId + ":" + episode + "-" + episode;',why:'逐集身份必须包含番剧 ID 与集数。真实项目保留 episodeStart-episode 字段，并规范为单集 k-k。'}
        ];
        el.innerHTML=labs.map(l=>`<section class="lab-card" data-lab="${l.id}"><h2>${l.title}</h2><p>${l.symptom}</p><div class="lab-tabs"><button data-variant="bad" aria-pressed="true">故障版本</button><button data-variant="good" aria-pressed="false">尝试最小修复</button></div><pre data-lab-code>${escape(l.bad)}</pre><button data-run>运行 2 个断言</button><div class="terminal" data-result aria-live="polite">尚未运行。先预测哪条断言会失败。</div><details><summary>为什么这能修好</summary><p>${l.why}</p></details></section>`).join('');
        el.querySelectorAll('[data-lab]').forEach(section=>{const info=labs.find(l=>l.id===section.dataset.lab);let fixed=false;section.querySelectorAll('[data-variant]').forEach(button=>button.addEventListener('click',()=>{fixed=button.dataset.variant==='good';section.querySelectorAll('[data-variant]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));section.querySelector('[data-lab-code]').textContent=fixed?info.good:info.bad;section.querySelector('[data-result]').textContent='已切换实现，请重新运行断言。';}));section.querySelector('[data-run]').addEventListener('click',()=>{const results=bugResults(info.id,fixed);section.querySelector('[data-result]').innerHTML=results.map(r=>`<span class="${r.actual===r.expected?'pass':'fail'}">${r.actual===r.expected?'PASS':'FAIL'}  ${escape(r.label)}</span>\n  expected: ${escape(JSON.stringify(r.expected))}\n  actual:   ${escape(JSON.stringify(r.actual))}`).join('\n')+`\n\n${results.filter(r=>r.actual===r.expected).length} / ${results.length} 通过 · ${fixed?'修复':'故障'}版本`;});});
      }
    });
  }
  window.TeachLabs={broadcast,normalize,watchedKey,queueCount,lanes,bugResults,requestScenarios,requestTrace,incidentCases,evaluateIncident,mount};
})();
