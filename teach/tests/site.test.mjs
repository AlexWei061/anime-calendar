import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { calendarDateForDateTime, layoutTimelineEvents, timelineMarkerForDateTime } from '../../lib/calendar.js';
import { matchesAnimeTitle } from '../../lib/anime-search.js';

const teach = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = resolve(teach, '..');
const read = name => readFileSync(resolve(teach, name), 'utf8');
const context = vm.createContext({ window: {} });
for (const name of ['snapshot.js', 'course.js', 'foundations.js', 'node-http.js', 'operations.js', 'labs.js']) vm.runInContext(read(name), context, { filename: name });
const { TEACH: course, TEACH_SOURCE: snapshot, TeachLabs: labs } = context.window;
const html = course.lessons.flatMap(l => [l.task, ...l.sections.map(s => s.html)]).join('\n') + course.labHTML + course.toolboxHTML;
const plain = value => JSON.parse(JSON.stringify(value));

test('入口只加载存在的本地资源，全部脚本语法有效', () => {
  for (const [,path] of read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.ok(!/^https?:/.test(path), `入口不应依赖远端资源：${path}`);
    assert.ok(existsSync(resolve(teach, path.split('?')[0])), path);
  }
  for (const name of ['snapshot.js', 'course.js', 'foundations.js', 'node-http.js', 'operations.js', 'labs.js', 'app.js']) assert.doesNotThrow(() => new vm.Script(read(name), { filename: name }));
  const entryScripts = [...read('index.html').matchAll(/<script[^>]+src="([^"]+)"/g)].map(([, path]) => path.split('?')[0]);
  assert.ok(entryScripts.indexOf('node-http.js') > entryScripts.indexOf('foundations.js'));
  assert.ok(entryScripts.indexOf('node-http.js') < entryScripts.indexOf('operations.js'));
});

test('十五课、练习与内部路由完整，题目答案有解释', () => {
  assert.equal(course.lessons.length, 15);
  const routes = new Set(['home', 'lab', 'map', 'toolbox', ...course.lessons.map(l => l.id)]);
  assert.equal(routes.size, 19);
  for (const [,route] of html.matchAll(/href="#([^"]+)"/g)) {
    const [id, section, ...extra] = route.split('/');
    assert.ok(routes.has(id), route);
    if (section !== undefined) {
      const lesson = course.lessons.find(item => item.id === id);
      assert.ok(lesson && extra.length === 0 && /^(0|[1-9]\d*)$/.test(section), route);
      assert.ok(Number.isSafeInteger(Number(section)) && Number(section) < lesson.sections.length, route);
    }
  }
  for (const lesson of course.lessons) {
    assert.ok(lesson.sections.length >= 4, lesson.id);
    assert.ok(lesson.task.includes('验收') || lesson.task.includes('达标'), lesson.id);
    assert.ok(lesson.quiz.answer >= 0 && lesson.quiz.answer < lesson.quiz.options.length);
    assert.ok(lesson.quiz.explanation.length > 20);
  }
  assert.ok(existsSync(resolve(teach, 'exercises/repair.mjs')));
  assert.ok(existsSync(resolve(teach, 'exercises/repair.test.mjs')));
});

test('所有源码片段与完整源码跳转的文件及行号都存在', () => {
  let count = 0;
  for (const [,path,start,end] of html.matchAll(/data-(?:snippet|source)="([^"]+)" data-start="(\d+)" data-end="(\d+)"/g)) {
    assert.ok(snapshot.files[path], path);
    const lines = snapshot.files[path].code.trimEnd().split('\n').length;
    assert.ok(Number(start) >= 1 && Number(end) >= Number(start) && Number(end) <= lines, `${path}:${start}-${end} / ${lines}`);
    count++;
  }
  assert.ok(count >= 25);
});

test('当前源码快照与当前工作区逐字相符，哈希正确', () => {
  assert.ok(Object.keys(snapshot.files).length >= 51);
  for (const path of ['01-hello.mjs', '02-routes.mjs', '03-memory.mjs', '04-student.mjs', '05-solution.mjs', 'assessment.test.mjs', 'examples.test.mjs']) {
    assert.ok(snapshot.files['teach/exercises/node-http/' + path], path);
  }
  for (const [path, file] of Object.entries(snapshot.files)) {
    const current = readFileSync(resolve(root, path), 'utf8');
    assert.ok(file.code === current, `源码已变化，请重生成并复核讲解：${path}`);
    assert.equal(file.sha256, createHash('sha256').update(current).digest('hex'));
  }
});

test('日期互动在跨月、闰日、年度与05:00边界上符合真实日历函数', () => {
  for (const date of ['2026-08-01', '2026-01-01', '2024-03-01', '2026-03-01']) {
    for (const time of ['00:00','04:59','05:00','06:00','23:59']) {
      const demo = labs.broadcast(date,time);
      assert.equal(demo.date,calendarDateForDateTime(date,time));
      const real=timelineMarkerForDateTime(date,time,300,1740);
      assert.equal(demo.time,real.time);
      assert.equal(demo.originalDate,date);
      assert.equal(demo.originalTime,time);
    }
  }
});

test('搜索互动对中日文、全角与空输入符合真实搜索函数', () => {
  const record = {titleZh:'BanG Dream! YUME∞MITA',titleJa:'バンドリ！ ゆめ∞みた'};
  for (const q of ['ｂａｎｇ','  BANG DREAM ','ゆめ','不存在','', '　']) {
    const result=[record.titleZh,record.titleJa].some(t=>labs.normalize(t).includes(labs.normalize(q)));
    assert.equal(result,matchesAnimeTitle(record,q),q);
  }
});

test('分栏互动与真实算法一致，同一栏的视觉区间不相交', () => {
  const cases = [[1200,1215,1220],[1200,1215,1230],[1200,1215,1260],[1200,1200,1200],[]];
  for (let seed=1;seed<=20;seed++) cases.push(Array.from({length:12},(_,i)=>1200+((seed*17+i*13)%24)*5));
  for (const starts of cases) {
    const demo=plain(labs.lanes(starts.map((start,i)=>({id:String(i),start}))));
    const real=layoutTimelineEvents(starts.map((start,i)=>({id:String(i),time:String(Math.floor(start/60)).padStart(2,'0')+':'+String(start%60).padStart(2,'0')})));
    assert.deepEqual(demo.map(e=>[e.id,e.start,e.lane,e.laneCount]),real.map(e=>[e.event.id,e.startMinutes,e.lane,e.laneCount]));
    for(let i=0;i<demo.length;i++)for(let j=i+1;j<demo.length;j++)if(demo[i].lane===demo[j].lane)assert.ok(demo[j].start>=demo[i].start+30);
  }
});

test('三个故障版各有一个真实失败，三个修复版全部通过', () => {
  for (const kind of ['midnight','search','watched']) {
    assert.equal(labs.bugResults(kind,false).filter(r=>r.actual===r.expected).length,1,kind);
    assert.equal(labs.bugResults(kind,true).filter(r=>r.actual===r.expected).length,2,kind);
  }
});

test('状态队列演示区分旧快照覆盖与函数式累计', () => {
  assert.equal(labs.queueCount(0,false),1);
  assert.equal(labs.queueCount(0,true),3);
  assert.equal(labs.queueCount(7,false),8);
  assert.equal(labs.queueCount(7,true),10);
});

test('维护课程覆盖当前部署、恢复与学习验收，源码不指向旧运行时', () => {
  for (const id of ['node', 'async', 'markup', 'deployment', 'backup', 'diagnosis', 'graduation']) {
    const lesson = course.lessons.find(item => item.id === id);
    assert.ok(lesson, id);
    assert.ok(lesson.sections.every(section => section.title && section.html), id);
    assert.ok(lesson.resources.length > 0, id);
  }
  for (const path of ['Dockerfile', 'compose.yaml', 'Caddyfile', 'db/sqlite.js', 'scripts/storage.mjs']) {
    assert.ok(snapshot.files[path], path);
  }
  assert.ok(!snapshot.files['worker/index.ts']);
  assert.ok(!snapshot.files['vite.config.ts']);
  assert.doesNotMatch(html, /data-(?:source|snippet)="(?:worker\/|vite\.config)/);
});

test('HTTP模拟按真实边界停止，响应到达前保留乐观UI，失败不改数据库', () => {
  const expected = {ok: 200, unauthorized: 401, origin: 403, invalid: 400, limited: 429, failed: 500};
  for (const [scenario, status] of Object.entries(expected)) {
    const trace = labs.requestTrace(scenario);
    assert.equal(trace.steps.at(-1).status, status, scenario);
    assert.ok(trace.steps.slice(0, -1).every(step => step.status === null));
    if (scenario !== 'ok') assert.deepEqual(plain(trace.steps.at(-1).database), ['saved-anime']);
    if (['unauthorized', 'origin', 'invalid', 'limited'].includes(scenario)) {
      assert.ok(!trace.steps.some(step => step.id === 'transaction'), scenario);
    }
  }
  assert.equal(labs.requestTrace('limited').path, '/api/auth/login');
  const failed = labs.requestTrace('failed');
  assert.deepEqual(plain(failed.steps.find(step => step.id === 'transaction').ui), ['saved-anime', 'demo']);
  assert.deepEqual(plain(failed.steps.at(-1).ui), ['saved-anime']);
  const origin = labs.requestTrace('origin');
  assert.ok(!origin.steps.some(step => step.id === 'session'));
});

test('故障诊断分别判定根因和行动，答错时返回针对性证据', () => {
  assert.ok(labs.incidentCases.length >= 5);
  for (const incident of labs.incidentCases) {
    assert.equal(incident.roots.filter(choice => choice.correct).length, 1);
    assert.equal(incident.actions.filter(choice => choice.correct).length, 1);
    for (let root = 0; root < incident.roots.length; root++) {
      for (let action = 0; action < incident.actions.length; action++) {
        const result = labs.evaluateIncident(incident.id, root, action);
        assert.equal(result.correct, !!incident.roots[root].correct && !!incident.actions[action].correct);
        assert.ok(result.rootFeedback.length > 10 && result.actionFeedback.length > 10);
        assert.ok(result.verification.includes('验收'));
      }
    }
  }
});

// Lightweight app event harness. This checks routing/state, not layout or real browser APIs.
function appHarness(hash = '#home', stored = '[]') {
  const elements = new Map();
  const history = [hash];
  let historyIndex = 0;
  function element(id) {
    if (!elements.has(id)) {
      const item = {
        textContent:'',dataset:{},value:'',events:{},attributes:{},children:[],htmlWrites:0,
        classList:{toggle(){return true;},add(){},remove(){}},
        querySelector(selector) { return this.children.find(child => child.id === selector) || null; },
        querySelectorAll(selector) {
          if (selector === '[data-lesson-section]') return this.children.filter(child => child.dataset.lessonSection !== undefined);
          if (selector === '[data-chapter-start]') return this.children.filter(child => child.dataset.chapterStart !== undefined);
          return [];
        },
        addEventListener(type,callback){this.events[type]=callback;},
        setAttribute(name,value){this.attributes[name]=value;},
        removeAttribute(name){delete this.attributes[name];},
        getAttribute(name){return this.attributes[name] ?? null;},
        focus(options){this.focused=true;this.focusOptions=options;this.focusCount=(this.focusCount||0)+1;document.activeElement=this;},
        scrollIntoView(options){this.scrollOptions=options;this.scrollCount=(this.scrollCount||0)+1;}
      };
      let markup = '';
      Object.defineProperty(item, 'innerHTML', {
        get(){return markup;},
        set(value){
          markup=value;
          this.htmlWrites++;
          if(id!=='main') return;
          this.children=[];
          for(const [,sectionId] of value.matchAll(/<section[^>]+id="(section-[^"]+)"/g)) {
            const key='#'+sectionId;
            elements.delete(key);
            const section=element(key);section.id=key;this.children.push(section);
          }
          for(const [,href,index] of value.matchAll(/<a href="([^"]+)" data-lesson-section="(\d+)"/g)) {
            const key='chapter-link-'+index;
            elements.delete(key);
            const anchor=element(key);anchor.attributes.href=href;anchor.dataset.lessonSection=index;this.children.push(anchor);
          }
          if(value.includes('data-chapter-start')) {
            elements.delete('chapter-start');
            const anchor=element('chapter-start');anchor.dataset.chapterStart='';this.children.push(anchor);
          }
        }
      });
      elements.set(id,item);
    }
    return elements.get(id);
  }
  const document = {title:'',events:{},querySelector:element,addEventListener(type,callback){this.events[type]=callback;}};
  const window = { TEACH:course,TEACH_SOURCE:snapshot,TeachLabs:{mounts:0,mount(){this.mounts++;}},events:{},scrolls:[],addEventListener(type,callback){this.events[type]=callback;},scrollTo(options){this.scrolls.push(options);} };
  const location = {hash};
  const localStorage = {getItem(){return stored;},setItem(){}};
  vm.runInNewContext(read('app.js'), {window,document,location,localStorage,FormData:class {}}, {filename:'app.js'});
  function navigate(next) {
    if(next===location.hash)return;
    history.splice(historyIndex+1);
    history.push(next);historyIndex++;
    location.hash=next;window.events.hashchange();
  }
  function moveHistory(delta) {
    const next=historyIndex+delta;
    if(next<0||next>=history.length)return;
    historyIndex=next;location.hash=history[next];window.events.hashchange();
  }
  function clickHash(href) {
    let prevented=false;
    const anchor={getAttribute(){return href;},closest(selector){return selector==='a[href^="#"]'?this:null;}};
    document.events.click({target:anchor,preventDefault(){prevented=true;}});
    if(!prevented)navigate(href);
    return prevented;
  }
  return {window,document,location,element,navigate,back:()=>moveHistory(-1),forward:()=>moveHistory(1),clickHash};
}

test('首页、十五课、实验室、地图、手册都能从hash直接渲染', () => {
  for (const route of ['home','lab','map','toolbox',...course.lessons.map(l=>l.id)]) {
    const app=appHarness('#'+route);
    assert.match(app.element('main').innerHTML, /<h1>/);
    assert.ok(app.document.title.includes('项目学习室'));
  }
});

test('跳到正文不会离开当前课，浏览器前进后退可恢复课程', () => {
  const app=appHarness('#calendar');
  let prevented=false;
  app.element('.skip').events.click({preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(app.location.hash,'#calendar');
  assert.equal(app.element('main').focused,true);
  app.location.hash='#backend';app.window.events.hashchange();
  assert.ok(app.element('main').innerHTML.includes('刷新后还在'));
});

test('损坏或旧版进度不会阻止页面打开，已完成课程可以恢复', () => {
  assert.doesNotThrow(()=>appHarness('#home','broken json'));
  assert.doesNotThrow(()=>appHarness('#home','{"not":"an array"}'));
  const app=appHarness('#home','["language","calendar","obsolete"]');
  assert.equal(app.element('#progress').value,2);
});

test('首页明确区分 Node/HTTP 深入样板和项目导读', () => {
  const app=appHarness('#home');
  assert.match(app.element('main').innerHTML,/class="sample-entry"/);
  assert.match(app.element('main').innerHTML,/href="#node">进入样板章/);
  assert.match(app.element('main').innerHTML,/目前仅这一章深入扩写/);
  assert.doesNotMatch(app.element('main').innerHTML,/20[–—-]30|3[–—-]4 周/);
});

test('深入章显示先修与全部章节目录，直达节号会聚焦对应内容', () => {
  const node=course.lessons.find(lesson=>lesson.id==='node');
  assert.equal(node.deep,true);
  assert.equal(typeof node.prerequisites,'string');
  const app=appHarness('#node/1');
  const markup=app.element('main').innerHTML;
  assert.match(markup,/aria-label="本章目录"/);
  assert.ok(markup.includes(node.prerequisites));
  for(let index=0;index<node.sections.length;index++){
    assert.ok(markup.includes('href="#node/'+index+'"'),String(index));
    assert.ok(markup.includes('id="section-node-'+index+'" tabindex="-1"'),String(index));
  }
  assert.equal(app.document.activeElement,app.element('#section-node-1'));
  assert.equal(app.element('#section-node-1').scrollOptions.block,'start');
  assert.equal(app.element('chapter-link-1').attributes['aria-current'],'location');
  assert.match(app.element('#navigation').innerHTML,/href="#node" aria-current="page"/);
});

test('同章节间前进后退与重复点击只滚动聚焦，不重建正文或重挂互动', () => {
  const app=appHarness('#node/0');
  const first=app.element('#section-node-0');
  first.answerOpen=true;
  first.interactionState='learner prediction';
  app.navigate('#node/1');
  assert.equal(app.element('main').htmlWrites,1);
  assert.equal(app.window.TeachLabs.mounts,1);
  assert.equal(app.document.activeElement,app.element('#section-node-1'));
  assert.equal(app.element('chapter-link-0').attributes['aria-current'],undefined);
  app.back();
  assert.equal(app.document.activeElement,first);
  assert.equal(first.answerOpen,true);
  assert.equal(first.interactionState,'learner prediction');
  app.forward();
  assert.equal(app.document.activeElement,app.element('#section-node-1'));
  const count=app.element('#section-node-1').scrollCount;
  assert.equal(app.clickHash('#node/1'),true);
  assert.equal(app.element('#section-node-1').scrollCount,count+1);
  assert.equal(app.element('main').htmlWrites,1);
  assert.equal(app.window.TeachLabs.mounts,1);
});

test('回章首和非法节号均安全回顶部，保留本章已展开的内容', () => {
  const app=appHarness('#node/1');
  const first=app.element('#section-node-0');
  first.answerOpen=true;
  app.clickHash('#node');
  assert.equal(app.document.activeElement,app.element('main'));
  assert.equal(app.window.scrolls.at(-1).top,0);
  assert.equal(app.element('chapter-start').attributes['aria-current'],'location');
  const scrollCount=app.window.scrolls.length;
  assert.equal(app.clickHash('#node'),true);
  assert.equal(app.window.scrolls.length,scrollCount+1);
  const count=course.lessons.find(lesson=>lesson.id==='node').sections.length;
  for(const suffix of ['-1','1.5','oops',String(count),'9007199254740992','1/extra','']){
    app.navigate('#node/'+suffix);
    assert.equal(app.document.activeElement,app.element('main'),suffix);
    assert.equal(app.window.scrolls.at(-1).top,0,suffix);
    assert.match(app.element('#navigation').innerHTML,/href="#node" aria-current="page"/);
  }
  assert.equal(app.element('main').htmlWrites,1);
  assert.equal(app.element('#section-node-0'),first);
  assert.equal(first.answerOpen,true);
  const invalidDirect=appHarness('#node/no-such-section');
  assert.equal(invalidDirect.document.activeElement,invalidDirect.element('main'));
});

test('跨课仍渲染相应内容，返回章节链接时重新定位目标节', () => {
  const app=appHarness('#node/1');
  app.navigate('#calendar');
  assert.equal(app.element('main').htmlWrites,2);
  assert.match(app.element('#navigation').innerHTML,/href="#calendar" aria-current="page"/);
  app.back();
  assert.equal(app.element('main').htmlWrites,3);
  assert.equal(app.window.TeachLabs.mounts,3);
  assert.equal(app.document.activeElement,app.element('#section-node-1'));
});
