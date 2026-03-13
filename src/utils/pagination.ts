/**
 * Builds a list of page numbers to show in pagination, with "ellipsis" placeholders
 * when there are gaps. Always shows first, last, and pages around the current one.
 *
 * @param currentPage - 1-based current page
 * @param totalPages - total number of pages
 * @param maxVisible - when total pages exceed this, show first, last, and neighbors of current (default 7)
 * @returns Array of page numbers or "ellipsis" for gaps
 */
export function getPaginationRange(
	currentPage: number,
	totalPages: number,
	maxVisible = 7,
): (number | "ellipsis")[] {
	const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
	if (totalPages <= maxVisible) return pages;

	const keep = new Set<number>(
		[1, totalPages, currentPage, currentPage - 1, currentPage + 1].filter(
			(p) => p >= 1 && p <= totalPages,
		),
	);

	const kept = pages.filter((p) => keep.has(p));
	const result: (number | "ellipsis")[] = [];
	for (let i = 0; i < kept.length; i++) {
		const p = kept[i];
		if (p === undefined) continue;
		const prev = i > 0 ? kept[i - 1] : 0;
		if (p - prev > 1) result.push("ellipsis");
		result.push(p);
	}
	return result;
}
