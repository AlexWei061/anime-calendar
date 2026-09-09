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
for (const name of ['snapshot.js', 'course.js', 'labs.js']) vm.runInContext(read(name), context, { filename: name });
const { TEACH: course, TEACH_SOURCE: snapshot, TeachLabs: labs } = context.window;
const html = course.lessons.flatMap(l => [l.task, ...l.sections.map(s => s.html)]).join('\n') + course.labHTML + course.toolboxHTML;
const plain = value => JSON.parse(JSON.stringify(value));

test('入口只加载存在的本地资源，全部脚本语法有效', () => {
  for (const [,path] of read('index.html').matchAll(/(?:src|href)="([^"#]+)"/g)) {
    assert.ok(!/^https?:/.test(path), `入口不应依赖远端资源：${path}`);
    assert.ok(existsSync(resolve(teach, path)), path);
  }
  for (const name of ['snapshot.js', 'course.js', 'labs.js', 'app.js']) assert.doesNotThrow(() => new vm.Script(read(name), { filename: name }));
});

test('八课、练习与内部路由完整，题目答案有解释', () => {
  assert.equal(course.lessons.length, 8);
  const routes = new Set(['home', 'lab', 'map', 'toolbox', ...course.lessons.map(l => l.id)]);
  assert.equal(routes.size, 12);
  for (const [,route] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(routes.has(route), route);
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

test('28个源码快照与当前工作区逐字相符，哈希正确', () => {
  assert.equal(Object.keys(snapshot.files).length, 28);
  for (const [path, file] of Object.entries(snapshot.files)) {
    const current = readFileSync(resolve(root, path), 'utf8');
    assert.equal(file.code, current, `源码已变化，请重生成并复核讲解：${path}`);
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

// Lightweight app event harness. This checks routing/state, not layout or real browser APIs.
function appHarness(hash = '#home', stored = '[]') {
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) elements.set(id, {innerHTML:'',textContent:'',dataset:{},value:'',events:{},classList:{toggle(){return true;},add(){},remove(){}},querySelectorAll(){return [];},addEventListener(type,callback){this.events[type]=callback;},setAttribute(){},focus(){this.focused=true;}});
    return elements.get(id);
  }
  const document = {title:'',querySelector:element,addEventListener(){}};
  const window = { TEACH:course,TEACH_SOURCE:snapshot,TeachLabs:{mount(){}},events:{},addEventListener(type,callback){this.events[type]=callback;},scrollTo(){} };
  const location = {hash};
  const localStorage = {getItem(){return stored;},setItem(){}};
  vm.runInNewContext(read('app.js'), {window,document,location,localStorage,FormData:class {}}, {filename:'app.js'});
  return {window,document,location,element};
}

test('首页、八课、实验室、地图、手册都能从hash直接渲染', () => {
  for (const route of ['home','lab','map','toolbox',...course.lessons.map(l=>l.id)]) {
    const app=appHarness('#'+route);
    assert.match(app.element('main').innerHTML, /<h1>/);
    assert.ok(app.element('main').innerHTML.length>1000,route);
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
