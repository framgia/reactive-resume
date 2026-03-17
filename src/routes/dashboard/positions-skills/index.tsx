import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
	BriefcaseIcon,
	DotsThreeIcon,
	FunnelSimpleIcon,
	PencilSimpleLineIcon,
	PlusIcon,
	SortAscendingIcon,
	TrashSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationBar } from "@/components/ui/pagination";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";

type TabValue = "positions" | "skills";
type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	tab: z.enum(["positions", "skills"]).default("positions"),
});

export const Route = createFileRoute("/dashboard/positions-skills/")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	search: {
		middlewares: [stripSearchParams({ tab: "positions" })],
	},
});

function RouteComponent() {
	const { tab } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const [sort, setSort] = useState<SortOption>("lastUpdatedAt");
	const [query, setQuery] = useState("");

	const sortOptions = useMemo(
		() => [
			{ value: "lastUpdatedAt", label: t`Last Updated` },
			{ value: "name", label: t`Name` },
			{ value: "createdAt", label: t`Created` },
		],
		[],
	);

	const setTab = (v: TabValue) => {
		navigate({ search: { tab: v } });
		setQuery("");
		setSort("lastUpdatedAt");
	};

	return (
		<div className="flex flex-col gap-y-4">
			<DashboardHeader icon={BriefcaseIcon} title={t`Positions & Skills`} />

			<Separator />

			<Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="flex flex-col">
				<TabsList>
					<TabsTrigger value="positions">
						<Trans>Positions</Trans>
					</TabsTrigger>
					<TabsTrigger value="skills">
						<Trans>Skills</Trans>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="positions" className="mt-4 flex flex-col gap-y-4">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<PositionsFilterPanel
							sort={sort}
							query={query}
							onSortChange={(v) => setSort(v as SortOption)}
							onQueryChange={setQuery}
							sortOptions={sortOptions}
						/>
					</div>
					<PositionsTab sort={sort} query={query} />
				</TabsContent>
				<TabsContent value="skills" className="mt-4 flex flex-col gap-y-4">
					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<SkillsFilterPanel
							sort={sort}
							query={query}
							onSortChange={(v) => setSort(v as SortOption)}
							onQueryChange={setQuery}
							sortOptions={sortOptions}
						/>
					</div>
					<SkillsTab sort={sort} query={query} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

type FilterPanelProps = {
	sort: string;
	query?: string;
	onSortChange: (value: string) => void;
	onQueryChange: (value: string) => void;
	sortOptions: { value: string; label: string }[];
};

function PositionsFilterPanel({ sort, query, onSortChange, onQueryChange, sortOptions }: FilterPanelProps) {
	const [filterOpen, setFilterOpen] = useState(false);
	const [nameInput, setNameInput] = useState(query ?? "");
	const appliedQuery = query ?? "";

	const hasActiveFilters = Boolean(appliedQuery.trim());

	const handleApplyFilter = () => {
		onQueryChange(nameInput.trim());
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		setNameInput("");
		onQueryChange("");
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) setNameInput(appliedQuery);
	};

	return (
		<>
			<div className="flex items-center gap-x-2">
				<Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-x-2">
							<FunnelSimpleIcon className="size-4" weight={hasActiveFilters ? "fill" : "regular"} />
							<Trans>Filter</Trans>
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-72">
						<div className="flex flex-col gap-y-3">
							<div className="space-y-2">
								<Label htmlFor="filter-position-name">
									<Trans>Position name</Trans>
								</Label>
								<Input
									id="filter-position-name"
									type="text"
									placeholder={t`Filter by name`}
									value={nameInput}
									onChange={(e) => setNameInput(e.target.value)}
									className="h-9"
								/>
							</div>
							<div className="flex gap-x-2">
								{hasActiveFilters && (
									<Button variant="ghost" size="sm" className="flex-1" onClick={handleClearFilter}>
										<Trans>Clear</Trans>
									</Button>
								)}
								<Button size="sm" className="flex-1" onClick={handleApplyFilter}>
									<Trans>Apply</Trans>
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
				{hasActiveFilters && (
					<Badge
						variant="outline"
						className="max-w-xs cursor-pointer truncate"
						onClick={handleClearFilter}
						title={t`Name: ${appliedQuery}`}
					>
						<Trans>Name</Trans>: {appliedQuery}
					</Badge>
				)}
			</div>
			<Combobox
				value={sort}
				options={sortOptions}
				onValueChange={(value) => value && onSortChange(value)}
				buttonProps={{
					title: t`Sort by`,
					variant: "ghost",
					children: (_, option) => (
						<>
							<SortAscendingIcon className="size-4 shrink-0 opacity-50" />
							{option?.label}
						</>
					),
				}}
			/>
		</>
	);
}

function SkillsFilterPanel({ sort, query, onSortChange, onQueryChange, sortOptions }: FilterPanelProps) {
	const [filterOpen, setFilterOpen] = useState(false);
	const [nameInput, setNameInput] = useState(query ?? "");
	const appliedQuery = query ?? "";

	const hasActiveFilters = Boolean(appliedQuery.trim());

	const handleApplyFilter = () => {
		onQueryChange(nameInput.trim());
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		setNameInput("");
		onQueryChange("");
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) setNameInput(appliedQuery);
	};

	return (
		<>
			<div className="flex items-center gap-x-2">
				<Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-x-2">
							<FunnelSimpleIcon className="size-4" weight={hasActiveFilters ? "fill" : "regular"} />
							<Trans>Filter</Trans>
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-72">
						<div className="flex flex-col gap-y-3">
							<div className="space-y-2">
								<Label htmlFor="filter-skill-name">
									<Trans>Skill name</Trans>
								</Label>
								<Input
									id="filter-skill-name"
									type="text"
									placeholder={t`Filter by name`}
									value={nameInput}
									onChange={(e) => setNameInput(e.target.value)}
									className="h-9"
								/>
							</div>
							<div className="flex gap-x-2">
								{hasActiveFilters && (
									<Button variant="ghost" size="sm" className="flex-1" onClick={handleClearFilter}>
										<Trans>Clear</Trans>
									</Button>
								)}
								<Button size="sm" className="flex-1" onClick={handleApplyFilter}>
									<Trans>Apply</Trans>
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
				{hasActiveFilters && (
					<Badge
						variant="outline"
						className="max-w-xs cursor-pointer truncate"
						onClick={handleClearFilter}
						title={t`Name: ${appliedQuery}`}
					>
						<Trans>Name</Trans>: {appliedQuery}
					</Badge>
				)}
			</div>
			<Combobox
				value={sort}
				options={sortOptions}
				onValueChange={(value) => value && onSortChange(value)}
				buttonProps={{
					title: t`Sort by`,
					variant: "ghost",
					children: (_, option) => (
						<>
							<SortAscendingIcon className="size-4 shrink-0 opacity-50" />
							{option?.label}
						</>
					),
				}}
			/>
		</>
	);
}

type PositionListItem = RouterOutput["position"]["list"]["items"][number];
type SkillListItem = RouterOutput["skill"]["list"]["items"][number];

function PositionsTab({ sort, query }: { sort: SortOption; query?: string }) {
	const { i18n } = useLingui();
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);
	const confirm = useConfirm();

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [sort, query]);

	const { data, isLoading } = useQuery<RouterOutput["position"]["list"]>(
		orpc.position.list.queryOptions({
			input: {
				query: query?.trim() || undefined,
				sort,
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
			},
		}),
	);

	const positions = (data?.items ?? []) as PositionListItem[];
	const total = data?.total ?? 0;

	type PositionRow = PositionListItem;

	const table = useReactTable({
		data: positions as PositionRow[],
		columns: useMemo<ColumnDef<PositionRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		rowCount: total,
		state: { pagination },
		onPaginationChange: (updater) => {
			setPagination((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next;
			});
		},
	});
	const { mutate: deletePosition, isPending: isDeleting } = useMutation<void, Error, { id: string }>(
		orpc.position.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.position.list.queryOptions({ input: {} }).queryKey,
				});
			},
		}),
	);

	const handleDelete = (id: string, name: string) => {
		confirm(t`Are you sure you want to delete "${name}"?`, {
			description: t`This will remove the position from all resumes and projects.`,
			confirmText: t`Delete`,
			cancelText: t`Cancel`,
		}).then((ok) => {
			if (!ok) return;
			const toastId = toast.loading(t`Deleting position...`);
			deletePosition(
				{ id },
				{
					onSuccess: () => toast.success(t`Position deleted.`, { id: toastId }),
					onError: (e) => toast.error(e.message, { id: toastId }),
				},
			);
		});
	};

	return (
		<div className="flex flex-col gap-y-2">
			<div className="flex items-center gap-x-2">
				<Button
					variant="ghost"
					size="lg"
					className="h-12 flex-1 justify-start gap-x-4 text-start"
					onClick={() => openDialog("position.create", undefined)}
				>
					<PlusIcon />
					<Trans>Create a new position</Trans>
				</Button>
			</div>

			{isLoading && !data ? (
				<div className="flex items-center justify-center gap-x-2 px-1 text-muted-foreground text-xs">
					<Spinner className="size-10" />
					<span>
						<Trans>Loading...</Trans>
					</span>
				</div>
			) : (
				<>
					<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1">
						<div className="px-1 font-medium text-muted-foreground text-xs">
							<Trans>Name</Trans>
						</div>
						<div className="px-1 font-medium text-muted-foreground text-xs">
							<Trans>Slug</Trans>
						</div>
						<div className="min-w-32 px-1 font-medium text-muted-foreground text-xs">
							<Trans>Created</Trans>
						</div>
						<div className="w-12" />

						{positions.map((position: PositionListItem) => (
							<div key={position.id} className="contents">
								<div className="flex h-12 items-center rounded-md px-1">
									<span className="truncate font-medium">{position.name}</span>
								</div>
								<div className="flex h-12 min-w-0 items-center truncate px-1 text-muted-foreground text-sm">
									{position.slug}
								</div>
								<p className="flex h-12 min-w-32 shrink-0 items-center px-1 text-xs opacity-60">
									{Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(
										position.createdAt,
									)}
								</p>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="icon" variant="ghost" className="size-12 shrink-0">
											<DotsThreeIcon />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() =>
												openDialog("position.update", {
													id: position.id,
													name: position.name,
													slug: position.slug,
												})
											}
										>
											<PencilSimpleLineIcon />
											<Trans>Edit</Trans>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={() => handleDelete(position.id, position.name)}
											disabled={isDeleting}
										>
											<TrashSimpleIcon />
											<Trans>Delete</Trans>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))}
					</div>

					<PaginationBar
						page={table.getState().pagination.pageIndex + 1}
						totalPage={table.getPageCount()}
						pageSize={table.getState().pagination.pageSize}
						onPageSizeChange={(size) => table.setPageSize(size)}
						getPageHref={() => "#"}
						canPreviousPage={table.getCanPreviousPage()}
						canNextPage={table.getCanNextPage()}
						onPageSelect={(pageNum) => table.setPageIndex(pageNum - 1)}
					/>
				</>
			)}
		</div>
	);
}

function SkillsTab({ sort, query }: { sort: SortOption; query?: string }) {
	const { i18n } = useLingui();
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);
	const confirm = useConfirm();

	const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: DEFAULT_PAGE_SIZE });

	useEffect(() => {
		setPagination((prev) => ({ ...prev, pageIndex: 0 }));
	}, [sort, query]);

	const { data, isLoading, isFetching } = useQuery<RouterOutput["skill"]["list"]>(
		orpc.skill.list.queryOptions({
			input: {
				query: query?.trim() || undefined,
				sort,
				page: pagination.pageIndex + 1,
				pageSize: pagination.pageSize,
			},
		}),
	);

	const skills = (data?.items ?? []) as SkillListItem[];
	const total = data?.total ?? skills.length;

	type SkillRow = SkillListItem;

	const table = useReactTable({
		data: skills as SkillRow[],
		columns: useMemo<ColumnDef<SkillRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		rowCount: total,
		state: { pagination },
		onPaginationChange: (updater) => {
			setPagination((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next;
			});
		},
	});
	const { mutate: deleteSkill, isPending: isDeleting } = useMutation<void, Error, { id: string }>(
		orpc.skill.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.skill.list.queryOptions({ input: {} }).queryKey,
				});
			},
		}),
	);

	const handleDelete = (id: string, name: string) => {
		confirm(t`Are you sure you want to delete "${name}"?`, {
			description: t`This will remove the skill from all resumes and projects.`,
			confirmText: t`Delete`,
			cancelText: t`Cancel`,
		}).then((ok) => {
			if (!ok) return;
			const toastId = toast.loading(t`Deleting skill...`);
			deleteSkill(
				{ id },
				{
					onSuccess: () => toast.success(t`Skill deleted.`, { id: toastId }),
					onError: (e) => toast.error(e.message, { id: toastId }),
				},
			);
		});
	};

	return (
		<div className="flex flex-col gap-y-2">
			<div className="flex items-center gap-x-2">
				<Button
					variant="ghost"
					size="lg"
					className="h-12 flex-1 justify-start gap-x-4 text-start"
					onClick={() => openDialog("skill.create", undefined)}
				>
					<PlusIcon />
					<Trans>Create a new skill</Trans>
				</Button>
				{isFetching && data && (
					<div className="flex items-center gap-x-2 px-1 text-muted-foreground text-xs">
						<Spinner className="size-4" />
						<span>
							<Trans>Updating...</Trans>
						</span>
					</div>
				)}
			</div>

			{isLoading && !data ? (
				<div className="flex items-center justify-center gap-x-2 px-1 text-muted-foreground text-xs">
					<Spinner className="size-4" />
					<span>
						<Trans>Loading...</Trans>
					</span>
				</div>
			) : (
				<>
					<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1">
						<div className="px-1 font-medium text-muted-foreground text-xs">
							<Trans>Name</Trans>
						</div>
						<div className="px-1 font-medium text-muted-foreground text-xs">
							<Trans>Slug</Trans>
						</div>
						<div className="min-w-32 px-1 font-medium text-muted-foreground text-xs">
							<Trans>Created</Trans>
						</div>
						<div className="w-12" />

						{skills.map((skill: SkillListItem) => (
							<div key={skill.id} className="contents">
								<div className="flex h-12 items-center rounded-md px-1">
									<span className="truncate font-medium">{skill.name}</span>
								</div>
								<div className="flex h-12 min-w-0 items-center truncate px-1 text-muted-foreground text-sm">
									{skill.slug}
								</div>
								<p className="flex h-12 min-w-32 shrink-0 items-center px-1 text-xs opacity-60">
									{Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(skill.createdAt)}
								</p>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button size="icon" variant="ghost" className="size-12 shrink-0">
											<DotsThreeIcon />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem
											onClick={() =>
												openDialog("skill.update", {
													id: skill.id,
													name: skill.name,
													slug: skill.slug,
												})
											}
										>
											<PencilSimpleLineIcon />
											<Trans>Edit</Trans>
										</DropdownMenuItem>
										<DropdownMenuItem
											className="text-destructive focus:text-destructive"
											onClick={() => handleDelete(skill.id, skill.name)}
											disabled={isDeleting}
										>
											<TrashSimpleIcon />
											<Trans>Delete</Trans>
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						))}
					</div>

					<PaginationBar
						page={table.getState().pagination.pageIndex + 1}
						totalPage={table.getPageCount()}
						pageSize={table.getState().pagination.pageSize}
						onPageSizeChange={(size) => table.setPageSize(size)}
						getPageHref={() => "#"}
						canPreviousPage={table.getCanPreviousPage()}
						canNextPage={table.getCanNextPage()}
						onPageSelect={(pageNum) => table.setPageIndex(pageNum - 1)}
					/>
				</>
			)}
		</div>
	);
}
