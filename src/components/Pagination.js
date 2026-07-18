export function Pagination({ page = 1, totalPages = 1 }) {
  if (totalPages <= 1) return ''
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
  return `
    <div class="mt-4 flex flex-wrap items-center justify-end gap-2">
      <button class="btn-ghost px-3 py-2" data-page-nav="prev" ${page === 1 ? 'disabled' : ''}>Previous</button>
      ${pages.map((item) => `<button class="${item === page ? 'btn-primary' : 'btn-ghost'} px-3 py-2" data-page-nav="${item}">${item}</button>`).join('')}
      <button class="btn-ghost px-3 py-2" data-page-nav="next" ${page === totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `
}
