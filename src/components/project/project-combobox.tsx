import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useDebounceValue } from "usehooks-ts";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { orpc } from "@/integrations/orpc/client";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_LIMIT = 50;

type ProjectSelectProps = {
	value?: string | null;
	onValueChange: (value: string | undefined) => void;
	disabled?: boolean;
	className?: string;
}

type ProjectListItem = { id: string; name: string; deletedAt: Date | null };

export function ProjectCombobox({
	value,
	onValueChange,
	disabled = false,
	className,
}: ProjectSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch] = useDebounceValue(search, SEARCH_DEBOUNCE_MS);

	const handleOpenChange = React.useCallback((next: boolean) => {
		setOpen(next);
	}, []);

	const { data } = useQuery({
		...orpc.project.list.queryOptions({
			input: {
				query: debouncedSearch.trim() || undefined,
				pageSize: LIST_LIMIT,
				page: 1,
				sort: "name",
			},
		}),
		enabled: open,
	});
	const projects: ProjectListItem[] = (data as { items?: ProjectListItem[] } | undefined)?.items ?? [];
	const activeProjects = projects.filter((p: ProjectListItem) => !p.deletedAt);

	const { data: selectedProject } = useQuery({
		...orpc.project.getById.queryOptions({ input: { id: value ?? "" } }),
		enabled: open && Boolean(value) && !activeProjects.some((p: ProjectListItem) => p.id === value),
	});

	const options = React.useMemo((): ComboboxOption<string>[] => {
		const list: ComboboxOption<string>[] = [];
		for (const p of activeProjects) {
			list.push({ value: p.id, label: p.name });
		}
		const selected = selectedProject as { id: string; name: string } | undefined;
		if (selected && value && !activeProjects.some((p: ProjectListItem) => p.id === value)) {
			list.push({
				value: selected.id,
				label: selected.name,
			});
		}
		return list;
	}, [activeProjects, selectedProject, value]);

	const handleValueChange = React.useCallback(
		(next: string | null, _option: ComboboxOption<string> | null) => {
			onValueChange(next || undefined);
		},
		[onValueChange],
	);

	return (
		<Combobox
			options={options}
			value={value ?? null}
			onValueChange={handleValueChange}
			disabled={disabled}
			clearable
			placeholder={t`Select project`}
			searchPlaceholder="Search projects..."
			emptyMessage={<Trans>No projects found.</Trans>}
			onSearchChange={setSearch}
			onOpenChange={handleOpenChange}
			className={className}
		/>
	);
}
