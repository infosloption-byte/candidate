interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const pageButtonClass = 'grid min-h-10 min-w-10 place-items-center rounded-xl border text-xs font-bold transition';

export const Pagination = ({ page, pageSize, total, onPageChange }: PaginationProps) => {
  if (total <= pageSize) return null;

  const totalPages = Math.ceil(total / pageSize);
  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, total);

  const pages: number[] = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, Math.max(5, page + 2));
  for (let value = start; value <= end; value += 1) pages.push(value);

  const goTo = (nextPage: number) => {
    if (nextPage >= 1 && nextPage <= totalPages && nextPage !== page) onPageChange(nextPage);
  };

  return (
    <nav className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label="Pagination">
      <p className="text-[10px] font-bold text-slate-400">
        Showing <span className="font-black text-slate-700">{firstItem}</span>–<span className="font-black text-slate-700">{lastItem}</span> of <span className="font-black text-slate-700">{total}</span>
      </p>

      <div className="flex items-center justify-between gap-1.5 sm:justify-end">
        <button
          type="button"
          className={`${pageButtonClass} border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => goTo(1)}
          disabled={page === 1}
          aria-label="First page"
          title="First page"
        >
          <span aria-hidden="true">«</span><span className="sr-only">First</span>
        </button>
        <button
          type="button"
          className={`${pageButtonClass} border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => goTo(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <span aria-hidden="true">‹</span><span className="sr-only">Previous</span>
        </button>

        {pages.map((value) => (
          <button
            key={value}
            type="button"
            className={`${pageButtonClass} ${value === page ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
            onClick={() => goTo(value)}
            aria-label={`Page ${value}`}
            aria-current={value === page ? 'page' : undefined}
          >
            {value}
          </button>
        ))}

        <button
          type="button"
          className={`${pageButtonClass} border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => goTo(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          title="Next page"
        >
          <span aria-hidden="true">›</span><span className="sr-only">Next</span>
        </button>
        <button
          type="button"
          className={`${pageButtonClass} border-slate-200 bg-white px-3 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40`}
          onClick={() => goTo(totalPages)}
          disabled={page === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          <span aria-hidden="true">»</span><span className="sr-only">Last</span>
        </button>
      </div>
    </nav>
  );
};
