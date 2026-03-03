import { useEffect, useMemo, useRef } from "react";

type ItemWithIdName = { id: string; name: string };

type IdLabelOption = { value: string; label: string };

/**
 * Builds options for an id-based multi-select (e.g. skills, positions) that:
 * - Shows current API results plus any selected IDs not in the results (so selection stays visible when searching).
 * - Caches id -> name so selected items keep their label when they drop out of search results.
 */
export function useIdLabelOptions(
	items: ItemWithIdName[],
	appliedIds: string[],
	inputIds: string[],
): { options: IdLabelOption[]; getLabel: (id: string) => string } {
	const labelCacheRef = useRef<Map<string, string>>(new Map());

	useEffect(() => {
		const cache = labelCacheRef.current;
		for (const item of items) cache.set(item.id, item.name);
	}, [items]);

	const options = useMemo(() => {
		const fromApi: IdLabelOption[] = items.map((item) => ({ value: item.id, label: item.name }));
		const fromApiIds = new Set(items.map((item) => item.id));
		const selectedIds = new Set([...appliedIds, ...inputIds]);
		const missing = [...selectedIds].filter((id) => !fromApiIds.has(id));
		const cache = labelCacheRef.current;
		return [...fromApi, ...missing.map((id) => ({ value: id, label: cache.get(id) ?? id }))];
	}, [items, appliedIds, inputIds]);

	const getLabel = useMemo(
		() => (id: string) => labelCacheRef.current.get(id) ?? id,
		[],
	);

	return { options, getLabel };
}
