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
    'app/page.tsx': '页面状态、用户事件与 React 渲染',
    'app/layout.tsx': '页面外壳、元数据、首屏主题',
    'app/globals.css': '主题 token、桌面时间轴与手机布局',
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
    'app/api/auth/avatar/route.ts': '经过认证的 R2 头像读写',
    'db/schema.ts': 'D1 四张业务表的结构与约束',
    'db/index.ts': '取得 DB 绑定并交给 Drizzle',
    'data/anime.js': '季度入口与全库目录',
    'vite.config.ts': '本地 vinext 与 Cloudflare 绑定',
    'worker/index.ts': 'Worker 请求入口',
    'package.json': '版本、依赖与可运行命令',
    'tests/calendar.test.mjs': '日历函数的输入与预期结果',
    'tests/anime-search.test.mjs': '中日文和全角查询回归',
    'tests/anime-episode-views.test.mjs': '逐集记录、并发回滚与批量校验回归',
    'tests/auth.test.mjs': '账号校验与 Cookie 协议边界',
    'tests/anime-selections.test.mjs': '白名单与 51 部收藏分批回归',
    'tests/rendered-html.test.mjs': '构建后 Worker HTML 与结构检查',
}
files = {}
for name, role in ROLES.items():
    raw = (ROOT / name).read_bytes()
    files[name] = {'role': role, 'code': raw.decode(), 'sha256': sha256(raw).hexdigest()}
result = {'createdAt': datetime.now(ZoneInfo("Asia/Shanghai")).isoformat(),
          'baseCommit': subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], cwd=ROOT, text=True).strip(),
          'note': '读取当前工作区，包含未提交改动；不是线上版本证明。', 'files': files}
(TEACH / 'snapshot.js').write_text('window.TEACH_SOURCE = ' + json.dumps(result, ensure_ascii=False) + ';\n')
print(f'Wrote {len(files)} source snapshots to teach/snapshot.js')
