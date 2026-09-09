import type { FormEvent, ReactNode } from "react";

export function PageHeading({ title, summary, onSearch, metrics, children }: {
  title: string;
  summary: string;
  onSearch?: (query: string) => void;
  metrics?: ReactNode;
  children?: ReactNode;
}) {
  const submitPageSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = String(new FormData(event.currentTarget).get("pageSearch") ?? "").trim();
    if (query) onSearch?.(query);
  };
  return (
    <section className="page-heading" aria-labelledby="page-heading-title">
      <div className="page-heading-copy">
        <h1 id="page-heading-title">{title}</h1>
        <p className="page-summary">{summary}</p>
        {metrics}
      </div>
      <div className="page-heading-controls">
        {onSearch ? (
          <form className="page-search" role="search" aria-label="查询番剧" onSubmit={submitPageSearch}>
            <label className="page-search-field">查询番剧<input name="pageSearch" type="search" placeholder="输入中文或日文名" /></label>
            <button type="submit">查询</button>
          </form>
        ) : null}
        {children}
      </div>
    </section>
  );
}
