"""Read actual migrations; run them only inside an in-memory SQLite database."""
from pathlib import Path
import sqlite3

root = Path(__file__).resolve().parents[2]
with sqlite3.connect(':memory:') as db:
    for migration in sorted((root / 'drizzle').glob('*.sql')):
        db.executescript(migration.read_text())
    tables = [row[0] for row in db.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )]
    print('实际迁移创建的表：', ', '.join(tables))
    for table in tables:
        # Table identifiers above come from the repository migrations, not user input.
        print(table, ':', ', '.join(row[1] for row in db.execute(f'PRAGMA table_info({table})')))
    print('内存实验结束。没有连接或修改应用的 D1 / .wrangler 数据。')
