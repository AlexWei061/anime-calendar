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
      if(type==='request'){
        const steps=[['点击追番','React 先把 demo 加入本地集合；请求发出。'],['PUT /api/anime-selections','JSON：{"animeIds":["demo"]}。同源请求携带 Cookie。'],['getSessionUser → 校验','身份由会话确定；浏览器无权挑选 user.email。'],['db.batch','同一账号：删除旧列表 + 分批插入完整新列表。'],['响应与界面','成功保留；401 或 500 回滚，并显示错误。']];
        el.innerHTML=widget('REQUEST TRACE / 单步模拟','跟随一次追番，找到可能失败的边界',`<div class="widget-controls"><label for="request-outcome">模拟结果</label><select id="request-outcome"><option value="ok">200 保存成功</option><option value="unauthorized">401 无有效会话</option><option value="failed">500 数据库失败</option></select><button data-next>下一步 →</button><button data-reset>重置</button></div><div class="step-list">${steps.map((s,i)=>`<div class="step-item" data-step="${i}"><div><strong>${s[0]}</strong><p>${s[1]}</p></div></div>`).join('')}</div><div class="terminal" aria-live="polite"></div><p class="subtle">完全隔离的流程模拟。不会发 HTTP 请求；demo 只是说明请求结构的占位 ID。</p>`);
        let step=0;const outcome=el.querySelector('select');const update=()=>{const status=outcome.value;el.querySelectorAll('[data-step]').forEach((s,i)=>s.classList.toggle('current',i===step));let output='UI 集合 = [demo]（乐观）\nD1 集合 = []\n状态 = 等待请求';if(step>=2&&status==='unauthorized')output='getSessionUser = null\nHTTP 401，数据库步骤跳过\nUI 回滚为 []，显示“保存失败，请重试。”';else if(step>=3)output=status==='failed'?'db.batch 失败，整批回滚\nD1 集合 = []\nHTTP 500；UI 回滚为 []':'db.batch 成功\nD1 集合 = [demo]\nHTTP 200；UI 保持 [demo]';el.querySelector('.terminal').textContent=output;el.querySelector('[data-next]').disabled=step===4;};
        el.querySelector('[data-next]').addEventListener('click',()=>{step=step===2&&outcome.value==='unauthorized'?4:Math.min(4,step+1);update();});el.querySelector('[data-reset]').addEventListener('click',()=>{step=0;update();});outcome.addEventListener('change',()=>{step=0;update();});update();
      }
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
  window.TeachLabs={broadcast,normalize,watchedKey,queueCount,lanes,bugResults,mount};
})();
