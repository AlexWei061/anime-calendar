"""Explicit source allowlist; never reads credentials or writes outside teach."""
from pathlib import Path
from hashlib import sha256
import json
import subprocess
from datetime import datetime
from zoneinfo import ZoneInfo

TEACH = Path(__file__).resolve().parent
ROOT = TEACH.parent
ROLES = {
    'app/page.tsx': '页面组合、URL 与跨页面状态',
    'app/layout.tsx': '页面外壳、元数据、首屏主题',
    'app/globals.css': '按顺序导入分层样式',
    'lib/anime-search.js': '标题规范化与全库搜索匹配',
    'lib/calendar.js': '日期运算、逐集排期与区间分栏',
    'lib/schedule.js': '日本时区到北京时间的辅助换算',
    'lib/anime-selections.js': '收藏 ID 白名单、去重与分批',
    'lib/anime-episode-views.js': '逐集稳定键、范围展开、更新与校验',
    'lib/anime-statistics.js': '观看进度与播出统计',
    'lib/auth.js': '输入校验、密码哈希、会话 Cookie 属性',
    'app/auth.ts': '从会话确认用户身份',
    'app/api/anime-selections/route.ts': '收藏 GET 与完整集合 PUT',
    'app/api/anime-episode-views/route.ts': '已看 GET、旧记录迁移与批量 PUT',
    'app/api/auth/login/route.ts': '验证密码并创建会话',
    'app/api/auth/me/route.ts': '当前用户身份接口',
    'app/api/auth/avatar/route.ts': '经过认证的私有头像文件读写',
    'db/schema.ts': 'SQLite 四张业务表的结构与约束',
    'db/index.ts': '复用 SQLite 连接并交给 Drizzle',
    'data/anime.js': '季度入口与全库目录',
    'package.json': '版本、依赖与可运行命令',
    'tests/calendar.test.mjs': '日历函数的输入与预期结果',
    'tests/anime-search.test.mjs': '中日文和全角查询回归',
    'tests/anime-episode-views.test.mjs': '逐集记录、并发回滚与批量校验回归',
    'tests/auth.test.mjs': '账号校验与 Cookie 协议边界',
    'tests/anime-selections.test.mjs': '白名单与 51 部收藏分批回归',
    'tests/rendered-html.test.mjs': '真实 standalone 服务的 HTML 与结构检查',
}
ROLES.update({'tests/storage-operations.test.mjs': '备份恢复与旧数据导入回归', 'app/hooks/use-viewer.tsx': '账号与追番状态、异步请求与隔离', 'app/hooks/library-state.js': '失败请求按单集恢复', 'app/hooks/use-display.ts': '时钟和系统主题订阅', 'app/components/calendar-page.tsx': '日历视图与周导航', 'app/components/calendar-cards.tsx': '节目卡与已看按钮', 'app/components/search-page.tsx': '全库搜索与派生结果', 'app/styles/tokens-base.css': '亮暗主题设计 token', 'app/styles/responsive.css': '移动端样式覆盖', 'db/sqlite.js': 'SQLite WAL 与带校验和的迁移', 'lib/server/http.js': '来源校验、请求体上限、限流和私有响应', 'lib/server/avatar-storage.js': '私有头像路径与文件操作', 'Dockerfile': '构建镜像、非 root 进程和健康检查', 'compose.yaml': '单实例服务、反向代理和持久化挂载', 'Caddyfile': '域名 HTTPS 与代理头', '.env.example': '公开占位配置示例', 'docs/deployment.md': '部署、备份恢复与旧数据迁移操作指南', 'scripts/storage.mjs': '一致性备份、验证、恢复与离线导入', 'scripts/backup.mjs': '备份命令入口', 'scripts/restore.mjs': '恢复命令入口', 'scripts/start.mjs': 'standalone 服务启动', 'scripts/package-standalone.mjs': '打包静态文件、迁移和运维脚本', 'scripts/test.mjs': '临时数据目录中的真实 HTTP 测试', 'app/api/health/route.ts': '实际读取 SQLite 的健康检查', 'next.config.ts': 'Next standalone 构建与服务端依赖'})
ROLES.update({
    'teach/exercises/node-http/01-hello.mjs': '教学示例：请求回调与文本响应',
    'teach/exercises/node-http/02-routes.mjs': '教学示例：路径、方法与查询参数',
    'teach/exercises/node-http/03-memory.mjs': '教学示例：JSON 校验与进程内状态',
    'teach/exercises/node-http/04-student.mjs': '独立作业：请实现 summary 接口的 TODO',
    'teach/exercises/node-http/05-solution.mjs': '独立作业参考答案：完成后再对照',
    'teach/exercises/node-http/examples.test.mjs': '教学示例的真实 HTTP 行为验证',
    'teach/exercises/node-http/assessment.test.mjs': '独立作业的真实 HTTP 契约验收',
})
files = {}
for name, role in ROLES.items():
    raw = (ROOT / name).read_bytes()
    files[name] = {'role': role, 'code': raw.decode(), 'sha256': sha256(raw).hexdigest()}
result = {'createdAt': datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(),
          'baseCommit': subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip(),
          'note': '读取当前工作区，包含未提交改动；不是线上版本证明。', 'files': files}
(TEACH / 'snapshot.js').write_text('window.TEACH_SOURCE = ' + json.dumps(result, ensure_ascii=False) + ';\n')
print(f'Wrote {len(files)} source snapshots to teach/snapshot.js')
