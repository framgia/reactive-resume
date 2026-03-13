import { Trans } from "@lingui/react/macro";
import { CaretUpDownIcon, CheckIcon, FolderIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { useDebounceValue } from "usehooks-ts";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

export const PROJECT_ALL = "__all__";
export const PROJECT_NONE = "none";

const SEARCH_DEBOUNCE_MS = 300;
const LIST_LIMIT = 50;

/** string = project id, or PROJECT_ALL / PROJECT_NONE, or null = none */
export type ProjectSelectValue = string | null;

type ProjectSelectProps = {
	value: ProjectSelectValue;
	onValueChange: (value: ProjectSelectValue) => void;
	disabled?: boolean;
	placeholder?: React.ReactNode;
	includeAll?: boolean;
	includeNone?: boolean;
	clearable?: boolean;
	buttonProps?: Omit<React.ComponentProps<typeof Button>, "children"> & {
		children?: (value: ProjectSelectValue, label: React.ReactNode) => React.ReactNode;
	};
	className?: string;
};

function isProjectId(value: string | null): value is string {
	return value !== null && value !== "" && value !== PROJECT_ALL && value !== PROJECT_NONE;
}

export function ProjectSelect({
	value,
	onValueChange,
	disabled = false,
	placeholder = null,
	includeAll = false,
	includeNone = false,
	clearable = true,
	buttonProps,
	className,
}: ProjectSelectProps) {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState("");
	const [debouncedSearch] = useDebounceValue(search, SEARCH_DEBOUNCE_MS);

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
	const projects = data?.items ?? [];
	const activeProjects = projects.filter((p) => !p.deletedAt);

	const selectedId = value && isProjectId(value) ? value : undefined;
	const { data: selectedProject } = useQuery({
		...orpc.project.getById.queryOptions({ input: { id: selectedId ?? "" } }),
		enabled: open && Boolean(selectedId) && !activeProjects.some((p) => p.id === value),
	});

	const options = React.useMemo(() => {
		const list: { value: string; label: React.ReactNode }[] = [];
		if (includeAll) list.push({ value: PROJECT_ALL, label: <Trans>All projects</Trans> });
		if (includeNone) list.push({ value: PROJECT_NONE, label: <Trans>No project</Trans> });
		for (const p of activeProjects) {
			list.push({ value: p.id, label: p.name });
		}
		if (selectedProject && value && isProjectId(value) && !activeProjects.some((p) => p.id === value)) {
			list.push({
				value: selectedProject.id,
				label: selectedProject.name,
			});
		}
		return list;
	}, [includeAll, includeNone, activeProjects, selectedProject, value]);

	const selectedOption =
		options.find(
			(o) =>
				(value === null && o.value === PROJECT_NONE) ||
				(value === PROJECT_ALL && o.value === PROJECT_ALL) ||
				o.value === value,
		) ?? (value && selectedProject ? { value: selectedProject.id, label: selectedProject.name } : null);
	const displayLabel =
		selectedOption?.label ??
		(value === null && includeNone ? <Trans>No project</Trans> : (placeholder ?? <Trans>Select project</Trans>));

	const handleSelect = React.useCallback(
		(selected: string) => {
			const next: ProjectSelectValue = selected === PROJECT_NONE || selected === "" ? null : selected;
			if (!clearable && next === null) return;
			onValueChange(next);
			setOpen(false);
			setSearch("");
		},
		[clearable, onValueChange],
	);

	const handleOpenChange = React.useCallback(
		(next: boolean) => {
			if (disabled) return;
			setOpen(next);
			if (!next) setSearch("");
		},
		[disabled],
	);

	const { className: buttonClassName, children: buttonChildren, ...buttonRest } = buttonProps ?? {};

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger asChild>
				<Button
					role="combobox"
					variant="outline"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"font-normal active:scale-100",
						typeof buttonChildren === "function" ? "" : "justify-between",
						disabled && "pointer-events-none opacity-60",
						buttonClassName,
					)}
					{...buttonRest}
				>
					{typeof buttonChildren === "function" ? (
						buttonChildren(value, displayLabel)
					) : (
						<>
							<span className="flex items-center gap-2 truncate">
								<FolderIcon className="size-4 shrink-0" weight="duotone" />
								{displayLabel}
							</span>
							<CaretUpDownIcon className="ms-2 shrink-0 opacity-50" />
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className={cn("min-w-[200px] p-0", className)}
				onOpenAutoFocus={(e) => e.preventDefault()}
			>
				<Command shouldFilter={false}>
					<CommandInput placeholder="Search projects..." value={search} onValueChange={setSearch} disabled={disabled} />
					<CommandList>
						<CommandEmpty>
							<Trans>No projects found.</Trans>
						</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = (value === null && option.value === PROJECT_NONE) || value === option.value;
								return (
									<CommandItem
										key={option.value}
										value={option.value}
										onSelect={() => handleSelect(option.value)}
										className="cursor-pointer"
									>
										<CheckIcon className={cn("size-4 shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
										<span className="truncate">{option.label}</span>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
