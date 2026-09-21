(() => {
  const { lessons } = window.TEACH;
  const sources = window.TEACH_SOURCE;
  const main = document.querySelector('main');
  const escape = (value) => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let completed = [];
  try { const saved = JSON.parse(localStorage.getItem('ac-teach-progress-v3') || '[]'); if (Array.isArray(saved)) completed = saved.filter(id => lessons.some(l => l.id === id)); } catch { /* Device-local progress is optional. */ }
  let lastSourceTrigger;
  let renderedPage;
  function parseRoute() {
    const [requested = 'home', rawSection, ...extra] = (location.hash.slice(1) || 'home').split('/');
    const lesson = lessons.find(item => item.id === requested);
    const id = lesson ? lesson.id : ['home', 'map', 'lab', 'toolbox'].includes(requested) ? requested : 'home';
    const number = rawSection !== undefined && /^(0|[1-9]\d*)$/.test(rawSection) ? Number(rawSection) : NaN;
    const section = lesson && extra.length === 0 && Number.isSafeInteger(number) && number < lesson.sections.length ? number : null;
    return { id, lesson, section, hasSection: rawSection !== undefined };
  }
  function chapterNav(lesson) {
    return '<nav class="chapter-nav" aria-label="本章目录"><div class="chapter-nav-head"><h2>本章目录</h2><a href="#' + lesson.id + '" data-chapter-start>回到章首 ↑</a></div><p>可以分节阅读。节内跳转会保留本章已经展开的答案和互动状态。</p><ol>' + lesson.sections.map((section, index) => '<li><a href="#' + lesson.id + '/' + index + '" data-lesson-section="' + index + '">' + escape(section.title) + '</a></li>').join('') + '</ol></nav>';
  }
  function updateChapterNav(route) {
    main.querySelectorAll('[data-lesson-section]').forEach(anchor => {
      if (Number(anchor.dataset.lessonSection) === route.section) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
    main.querySelectorAll('[data-chapter-start]').forEach(anchor => {
      if (route.section === null) anchor.setAttribute('aria-current', 'location');
      else anchor.removeAttribute('aria-current');
    });
  }
  const sourceButton = (path,start=1,end=start,label=path) => `<button class="source-link" data-source="${escape(path)}" data-start="${start}" data-end="${end}">${escape(label)}</button>`;
  function fillSnippets(container) {
    container.querySelectorAll('[data-snippet]').forEach(el => {
      const path=el.dataset.snippet, start=Number(el.dataset.start), end=Number(el.dataset.end);
      const code=sources.files[path].code.split('\n').slice(start-1,end).map((line,i)=>`<span class="line-no">${start+i}</span>${escape(line)}`).join('\n');
      const notes=el.innerHTML;
      el.className='code-block';
      el.innerHTML=`<div class="code-head"><span>${escape(path)} : ${start}–${end}</span>${sourceButton(path,start,end,'看完整源码 ↗')}</div><pre><code>${code}</code></pre>${notes?`<div class="annotations">${notes}</div>`:''}`;
    });
  }
  function nav() {
    const hash=parseRoute().id;
    document.querySelector('#navigation').innerHTML=`<a href="#home" class="${hash==='home'?'active':''}"><span class="nav-number">⌂</span>学习路线</a><div class="nav-label">沿着项目学 · ${lessons.length} 站</div>${lessons.map((l,i)=>`<a href="#${l.id}" ${hash===l.id?'aria-current="page"':''} class="${hash===l.id?'active':''}"><span class="nav-number">${completed.includes(l.id)?'✓':String(i+1).padStart(2,'0')}</span>${l.nav||l.title}</a>`).join('')}<div class="nav-label">边做边查</div><a href="#lab" class="${hash==='lab'?'active':''}"><span class="nav-number">⌘</span>Bug 实验室</a><a href="#map" class="${hash==='map'?'active':''}"><span class="nav-number">↗</span>源码地图</a><a href="#toolbox" class="${hash==='toolbox'?'active':''}"><span class="nav-number">≡</span>维护速查手册</a>`;
    document.querySelector('#progress').max=lessons.length;
    document.querySelector('#progress').value=completed.length;
    document.querySelector('#progress-label').textContent=`已完成 ${completed.length} / ${lessons.length} 课`;
  }
  function home() {
    const next=lessons.find(l=>!completed.includes(l.id))||lessons[0];
    return `<section class="hero"><div><div class="eyebrow">围绕真实项目，补齐 Web 知识</div><h1>读懂你写出来的<br><em>番剧日历。</em></h1><p>从 Node / HTTP 的深入样板章开始，亲手运行一个服务。<br>把熟悉的函数、状态与输入输出，接到真实请求和项目源码上。</p><div class="actions"><a class="button" href="#${completed.length?next.id:'node'}">${completed.length?'继续学习':'开始深入样板'} <span>→</span></a><a class="button secondary" href="#map">先看项目全貌</a></div></div><div class="hero-visual" aria-label="页面等于目录、状态和外部快照的渲染结果"><span class="visual-label">YOUR PROJECT, AS A FUNCTION</span><div class="equation">V = render(D, S, E)</div><div class="flow"><div class="flow-node">目录 D<small>data/anime.js<br>作品与排期</small></div><span class="flow-arrow">＋</span><div class="flow-node">状态 S<small>app/hooks/ + page<br>个人状态 · 当前周</small></div><span class="flow-arrow">→</span><div class="flow-node">界面 V<small>React + CSS<br>你看到的日历</small></div></div><div class="mini-code">点击下一周 → S 改变 → 重新计算 V</div><p class="visual-note">E 是时间、主题等外部快照。先理解输入与输出，再拆开内部实现。</p></div></section><section class="sample-entry" aria-labelledby="sample-entry-title"><div><span class="pill">深入样板章</span><h2 id="sample-entry-title">Node + HTTP：从第一个进程到真实接口</h2><p>从程序运行在哪里讲起，逐步启动服务、读取请求、返回响应、验证输入，再回到这个项目。每节都有可以运行、解释与核对的证据。</p><p class="subtle">目前仅这一章深入扩写；其它课程是项目导读，不等同于同样深度的自学教材。</p></div><a class="button" href="#node">进入样板章 →</a></section><div class="intro-strip"><div><span>你的起点</span><strong>C++ / Python + 算法基础</strong></div><div><span>学习节奏</span><strong>${lessons.length} 课 · 阅读 + 动手</strong></div><div><span>学习方法</span><strong>预测 → 运行 → 解释 → 验证</strong></div></div><div class="stage-grid"><a href="#web"><small>01 / 建立模型</small><strong>浏览器与 Node</strong><span>深入样板 + 基础导读 · 先读懂请求</span></a><a href="#react"><small>02 / 理解项目</small><strong>界面、账号与数据</strong><span>项目导读 · 顺着源码追踪行为</span></a><a href="#debug"><small>03 / 完成变更</small><strong>调试、测试与 Git</strong><span>项目导读 · 定位入口和验证方法</span></a><a href="#deployment"><small>04 / 持续维护</small><strong>上线、恢复与排障</strong><span>项目导读 · 认识部署与恢复边界</span></a></div><div class="section-top"><h2>深入样板与项目导读</h2><p>先实做样板，再按问题查阅导读</p></div><div class="lesson-grid">${lessons.map((l,i)=>`<a class="lesson-card" href="#${l.id}"><span class="number">${String(i+1).padStart(2,'0')}</span><div><small>${escape(l.time)}</small><h3>${escape(l.title)}</h3><p>${escape(l.subtitle)}</p></div><span>↗</span></a>`).join('')}</div><div class="callout"><strong>建议这样用：一边打开教材，一边打开项目。</strong><p>当前只有 Node / HTTP 章按深入自学教材扩写，其余课程仍是项目导读。先预测示例结果，再在终端运行、解释响应和错误；不要把阅读时长、页面进度或导读中的检查清单当作独立维护能力。接下来根据样板章的实做结果，再逐步补齐其它主题。</p></div><div class="two-col"><div class="callout purple"><strong>会做竞赛题，是一个好起点</strong><p>区间分栏是贪心；收藏是集合；网络保存是状态机；修 bug 是构造反例。新知识主要是执行环境和数据寿命。</p></div><div class="callout amber"><strong>教材与真实项目的关系</strong><p>教材按当前 Node / SQLite / Docker / Caddy 架构编写。源码来自工作区快照；网页实验是明确标注的模拟。真实命令练习使用隔离数据目录。进度为学习者自评，不代表已通过生产运维认证。</p></div></div>`;
  }
  function lessonHTML(l,printing=false) {
    const index=lessons.indexOf(l);
    return `<article class="${printing?'print-lesson':''}"><header class="lesson-head"><div class="eyebrow">第 ${String(index+1).padStart(2,'0')} 课 / ${lessons.length}</div><h1>${escape(l.title)}</h1><p>${escape(l.lead)}</p><div class="lesson-meta"><span>${escape(l.time)}</span><span>建议先修：${escape(l.prerequisites||(index?(lessons[index-1].nav||lessons[index-1].title):'函数、循环、数组'))}</span></div><div class="objectives">${l.tags.map(t=>`<span class="pill">${escape(t)}</span>`).join('')}</div></header>${!printing&&l.deep?chapterNav(l):''}<div class="lesson-body">${l.sections.map((s,i)=>`<section class="lesson-section" id="section-${l.id}-${i}" tabindex="-1"><h2>${escape(s.title)}</h2>${s.html}${!printing&&l.deep?'<a class="chapter-back" href="#'+l.id+'">回到本章目录 ↑</a>':''}</section>`).join('')}${printing?'':`<form class="quiz" data-quiz="${l.id}"><small>CHECK YOUR MODEL / 先预测，再检查</small><fieldset><legend>${escape(l.quiz.question)}</legend>${l.quiz.options.map((o,i)=>`<label><input type="radio" name="answer" value="${i}" required>${escape(o)}</label>`).join('')}</fieldset><button type="submit">检查答案</button><p class="feedback" aria-live="polite"></p></form>`}<div class="task-box"><small>FIELD WORK / 本课验收</small>${l.task}</div>${l.resources?`<div class="resources"><h3>继续读官方资料</h3>${l.resources.map(r=>`<a href="${r.url}" target="_blank" rel="noreferrer">${escape(r.title)} ↗</a>`).join('')}</div>`:''}</div>${printing?'':`<div class="lesson-bottom"><button class="done-button" data-complete="${l.id}" aria-pressed="${completed.includes(l.id)}">${completed.includes(l.id)?'✓ 已完成本课（点击撤销）':'我已完成本课验收'}</button><div class="actions">${index?`<a class="button secondary" href="#${lessons[index-1].id}">← 上一课</a>`:''}<a class="button" href="#${lessons[index+1]?.id||'lab'}">${lessons[index+1]?'下一课':'进入 Bug 实验室'} →</a></div></div>`}</article>`;
  }
  function mapHTML() {
    return `<header class="lesson-head"><div class="eyebrow">REPOSITORY ATLAS</div><h1>遇到问题，先找哪一层？</h1><p>按数据的方向阅读，比从第一行顺读整个仓库更有效。点击文件，直接查看带行号的真实源码快照。</p></header><div class="route-map"><div class="flow"><div class="flow-node">导入脚本<small>scripts/ · 开发时运行</small></div><span class="flow-arrow">→</span><div class="flow-node">静态目录<small>data/ · 随构建发布</small></div><span class="flow-arrow">→</span><div class="flow-node">纯函数<small>lib/ · 排期与计算</small></div><span class="flow-arrow">→</span><div class="flow-node">页面<small>app/components/ · 组合界面</small></div></div><div class="flow"><div class="flow-node">浏览器动作<small>点击追番 · 乐观更新</small></div><span class="flow-arrow">→</span><div class="flow-node">HTTP / JSON<small>PUT /api/anime-selections</small></div><span class="flow-arrow">→</span><div class="flow-node">Next.js API 路由<small>会话认证 → 数据校验</small></div><span class="flow-arrow">→</span><div class="flow-node">SQLite 数据库<small>该账号的持久记录</small></div></div></div><div class="callout amber"><strong>浏览器与服务器分别执行代码。</strong><p>上方是公共排期的数据流，下方是个人记录的请求流。两者在页面汇合；页面不会在每次刷新时去爬取 YUC。</p></div><label for="file-filter">筛选文件</label> <input id="file-filter" type="search" placeholder="输入 auth、calendar 或中文职责"><p class="subtle">快照含 ${Object.keys(sources.files).length} 个重点文件；脚本全量目录请在编辑器中查看。</p><div class="file-grid" id="file-grid">${fileCards('')}</div>`;
  }
  function fileCards(query) {
    const entries=Object.entries(sources.files).filter(([p,v])=>(p+v.role).toLowerCase().includes(query.toLowerCase()));
    return entries.length?entries.map(([path,v])=>`<button class="file-card" data-source="${escape(path)}" data-start="1" data-end="1"><strong>${escape(path)}</strong><span>${escape(v.role)}</span><small>${v.code.split('\n').length} 行 · 查看源码 ↗</small></button>`).join(''):'<p>没有匹配的文件。试试 calendar 或 auth。</p>';
  }
  function render(focus = false) {
    const route = parseRoute();
    const { id, lesson, section } = route;
    if (renderedPage !== id) {
      main.innerHTML = lesson ? lessonHTML(lesson) : id === 'map' ? mapHTML() : id === 'lab' ? (window.TEACH.labHTML || '') : id === 'toolbox' ? (window.TEACH.toolboxHTML || '') : home();
      renderedPage = id;
      fillSnippets(main);
      window.TeachLabs.mount?.(main);
    }
    nav();
    updateChapterNav(route);
    document.title = (lesson?.title || ({map: '源码地图', lab: 'Bug 实验室', toolbox: '维护速查手册'}[id] || '学习路线')) + ' · 项目学习室';
    if (section !== null) {
      const target = main.querySelector('#section-' + id + '-' + section);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: 'start', behavior: 'instant' });
    } else if (focus || route.hasSection) {
      main.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  document.addEventListener('click',event=>{
    const routeLink = event.target.closest('a[href^="#"]');
    if (routeLink && routeLink.getAttribute('href') === location.hash && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      render(true);
    }
    const source=event.target.closest('[data-source]');
    if(source){
      const file=sources.files[source.dataset.source]; if(!file)return;
      const start=Number(source.dataset.start||1),end=Number(source.dataset.end||start);
      lastSourceTrigger=source;
      document.querySelector('#source-title').textContent=source.dataset.source;
      document.querySelector('#source-meta').textContent=`${file.role} · 基线提交 ${sources.baseCommit} + 工作区改动 · SHA-256 ${file.sha256.slice(0,12)} · 本页为快照，改代码请用编辑器。`;
      document.querySelector('#source-code').innerHTML=file.code.split('\n').map((line,i)=>`<span id="source-line-${i+1}" class="source-line ${i+1>=start&&i+1<=end?'highlight':''}"><span class="line-no">${i+1}</span>${escape(line)}</span>`).join('');
      document.querySelector('#source-dialog').showModal();
      document.querySelector(`#source-line-${start}`)?.scrollIntoView({block:'center',behavior:'instant'});
    }
    const button=event.target.closest('[data-complete]');
    if(button){const id=button.dataset.complete;completed=completed.includes(id)?completed.filter(v=>v!==id):[...completed,id];try{localStorage.setItem('ac-teach-progress-v3',JSON.stringify(completed));}catch{/* Progress still works for this session. */}button.setAttribute('aria-pressed',String(completed.includes(id)));button.textContent=completed.includes(id)?'✓ 已完成本课（点击撤销）':'我已完成本课验收';nav();}
  });
  document.addEventListener('submit',event=>{
    if(!event.target.matches('[data-quiz]'))return;
    event.preventDefault();const quiz=lessons.find(l=>l.id===event.target.dataset.quiz).quiz;const selected=Number(new FormData(event.target).get('answer'));const correct=selected===quiz.answer;const feedback=event.target.querySelector('.feedback');feedback.className=`feedback ${correct?'':'wrong'}`;feedback.textContent=`${correct?'答对了。':'再想一步。'}${quiz.explanation}`;
  });
  document.querySelector('#course-search').addEventListener('input',event=>{
    const q=event.target.value.trim().toLowerCase();const results=document.querySelector('#search-results');
    if(!q){results.innerHTML='';return;}
    const matches=lessons.filter(l=>(l.title+l.tags.join(' ')+l.sections.map(s=>s.title+s.html.replace(/<[^>]*>/g,' ')).join(' ')).toLowerCase().includes(q));
    results.innerHTML=matches.length?matches.map(l=>`<a href="#${l.id}">${escape(l.title)} ↗</a>`).join(''):'未找到。试试：API、state、测试。';
  });
  document.addEventListener('input',event=>{if(event.target.id==='file-filter')document.querySelector('#file-grid').innerHTML=fileCards(event.target.value);});
  document.querySelector('.skip').addEventListener('click',event=>{event.preventDefault();main.focus();});
  document.querySelector('#close-source').addEventListener('click',()=>document.querySelector('#source-dialog').close());
  document.querySelector('#source-dialog').addEventListener('close',()=>lastSourceTrigger?.focus());
  document.querySelector('#reading-mode').addEventListener('click',event=>{const active=document.body.classList.toggle('reading');event.target.setAttribute('aria-pressed',String(active));event.target.textContent=active?'退出专注':'专注阅读';});
  document.querySelector('#print-course').addEventListener('click',()=>{
    document.querySelector('#print-book')?.remove();const book=document.createElement('div');book.id='print-book';book.innerHTML=`<h1>读懂你的番剧日历</h1><p>数学系学生的项目维护教材 · ${sources.createdAt.slice(0,10)} 工作区快照</p>${lessons.map(l=>lessonHTML(l,true)).join('')}<article class="print-lesson">${window.TEACH.toolboxHTML||''}</article>`;document.body.append(book);fillSnippets(book);document.body.classList.add('printing-book');window.print();
  });
  window.addEventListener('afterprint',()=>{document.body.classList.remove('printing-book');document.querySelector('#print-book')?.remove();});
  document.querySelector('#snapshot-date').textContent=`源码快照 ${sources.createdAt.slice(0,10)} · ${sources.baseCommit} + 工作区`;
  window.addEventListener('hashchange',()=>render(true));
  render();
})();
