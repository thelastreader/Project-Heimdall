/**
 * Renders pagination controls for fixed-size record tables in the TB screening interface.
 * Calculates page boundaries from the record count and keeps user-selected pages inside the valid range.
 */

import { useState } from 'react';

/** Defines the current page, record count, page capacity, and page-change callback. */
export interface PaginationProps {
  page: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}

/**
 * Renders table navigation with a default capacity of 10 rows per page.
 * Derives ``ceil(totalItems / pageSize)`` so the final partial page remains reachable and disables directional controls at array boundaries.
 *
 * @param props - Current paging state and callback supplied by the parent table.
 * @returns Pagination controls, or ``null`` when every record fits on one page.
 */
export default function Pagination({ page, totalItems, pageSize = 10, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize)); const [jump, setJump] = useState('');
  const go = () => { const value = Number(jump); if (Number.isInteger(value) && value >= 1 && value <= totalPages) onPageChange(value); setJump(''); };
  if (totalItems <= pageSize) return null;
  const numbers = [page - 1, page, page + 1, page + 2].filter(value => value >= 1 && value <= totalPages);
  return <div className="flex items-center justify-between gap-3 flex-wrap px-5 py-3 border-t border-slate-100 bg-white"><div className="flex items-center gap-1"><button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => onPageChange(page - 1)}>&lt;</button>{numbers.map(value => <button key={value} className={`btn btn-sm min-w-8 ${value === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => onPageChange(value)}>{value}</button>)}<button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>&gt;</button></div><div className="flex items-center gap-2"><input className="input w-20" placeholder="Page #" inputMode="numeric" value={jump} onChange={event => setJump(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') go(); }} /><button className="btn btn-ghost btn-sm" onClick={go}>Go</button></div></div>;
}
