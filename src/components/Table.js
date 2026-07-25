export function createTable({
  id = 'table',
  columns = [],
  data = [],
  sortBy = '',
  sortDirection = 'asc',
  emptyMessage = 'No rows found.',
  clickableRows = false,
}) {
  const rows = data
    .map(
      (row) =>
        `<tr${clickableRows ? ` data-row-id="${row.id}" class="cursor-pointer"` : ''}>${columns.map((column) => `<td>${column.render ? column.render(row) : (row[column.key] ?? '—')}</td>`).join('')}</tr>`,
    )
    .join('')
  return `
    <div class="table-wrap">
      <table id="${id}" class="data-table">
        <thead><tr>${columns.map((column) => `<th>${column.sortable === false ? column.label : `<button class="inline-flex items-center gap-1 font-medium hover:text-forest" data-sort-key="${column.key}">${column.label}${sortBy === column.key ? `<span>${sortDirection === 'asc' ? '↑' : '↓'}</span>` : ''}</button>`}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="${columns.length}" class="py-8 text-center text-slate-500">${emptyMessage}</td></tr>`}</tbody>
      </table>
    </div>
  `
}
