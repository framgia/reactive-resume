import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { FolderIcon, SortAscendingIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate, useRouter } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo, useState } from "react";
import z from "zod";
import { Combobox } from "@/components/ui/combobox";
import { PaginationBar } from "@/components/ui/pagination";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/constants";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";
import { ListView } from "./-components/list-view";
import {
	type ProjectFiltersApplied,
	ProjectFilterPopover,
} from "./-components/filter";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
	page: z.coerce.number().int().min(1).default(1),
	pageSize: z.coerce
		.number()
		.int()
		.min(1)
		.max(100)
		.default(DEFAULT_PAGE_SIZE)
		.transform((n) => (PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : DEFAULT_PAGE_SIZE)),
});

export const Route = createFileRoute("/dashboard/projects/")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	search: {
		middlewares: [stripSearchParams({ sort: "lastUpdatedAt", page: 1, pageSize: DEFAULT_PAGE_SIZE })],
	},
});

function RouteComponent() {
	const { i18n } = useLingui();
	const router = useRouter();
	const { sort, page, pageSize } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });
	const pathname = router.state.location.pathname;
	const makePageHref = (p: number) => `${pathname}?sort=${encodeURIComponent(sort)}&page=${p}&pageSize=${pageSize}`;

	const [appliedFilters, setAppliedFilters] = useState<ProjectFiltersApplied>({
		name: "",
		customerName: "",
		domainIds: [],
		skillIds: [],
		positionId: null,
		positionName: "",
		domainNames: [],
		skillNames: [],
	});

	const { data: listData, isLoading } = useQuery<
		RouterOutput["project"]["list"]
	>(
		orpc.project.list.queryOptions({
			input: {
				sort,
				page,
				pageSize,
				name: appliedFilters.name?.trim() || undefined,
				customerName: appliedFilters.customerName?.trim() || undefined,
				domainIds: appliedFilters.domainIds.length > 0 ? appliedFilters.domainIds : undefined,
				skillIds: appliedFilters.skillIds.length > 0 ? appliedFilters.skillIds : undefined,
				positionId: appliedFilters.positionId ?? undefined,
			},
		}),
	);
	const projects = listData?.items ?? [];
	const total = listData?.total ?? 0;

	type ProjectRow = RouterOutput["project"]["list"]["items"][number];

	const table = useReactTable({
		data: projects,
		columns: useMemo<ColumnDef<ProjectRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		rowCount: total,
		state: {
			pagination: { pageIndex: page - 1, pageSize },
		},
		onPaginationChange: (updaterOrValue) => {
			const prev = { pageIndex: page - 1, pageSize };
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(prev)
					: (updaterOrValue as typeof prev);
			const nextPage = next.pageSize !== pageSize ? 1 : next.pageIndex + 1;
			navigate({ search: { sort, page: nextPage, pageSize: next.pageSize } });
		},
	});

	const sortOptions = useMemo(() => {
		return [
			{ value: "lastUpdatedAt", label: i18n.t("Last Updated") },
			{ value: "createdAt", label: i18n.t("Created") },
			{ value: "name", label: i18n.t("Name") },
		];
	}, [i18n]);

	return (
		<div className="space-y-4">
			<DashboardHeader icon={FolderIcon} title={t`Projects`} />

			<Separator />

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<ProjectFilterPopover
					appliedFilters={appliedFilters}
					onFiltersChange={setAppliedFilters}
				/>
				<Combobox
					value={sort}
					options={sortOptions}
					onValueChange={(value) => {
						if (!value) return;
						navigate({ search: { sort: value as SortOption, page: 1, pageSize } });
					}}
					buttonProps={{
						title: t`Sort by`,
						variant: "ghost",
						children: (_, option) => (
							<>
								<SortAscendingIcon />
								{option?.label}
							</>
						),
					}}
				/>
			</div>

			{isLoading && !listData ? (
				<div className="flex items-center justify-center gap-x-2 px-1 py-8 text-muted-foreground text-xs">
					<Spinner className="size-10" />
					<span>
						<Trans>Loading...</Trans>
					</span>
				</div>
			) : (
				<>
					<ListView projects={projects as RouterOutput["project"]["list"]["items"]} />

					<PaginationBar
						page={table.getState().pagination.pageIndex + 1}
						totalPage={table.getPageCount()}
						pageSize={table.getState().pagination.pageSize}
						onPageSizeChange={(size) => table.setPageSize(size)}
						getPageHref={makePageHref}
						canPreviousPage={table.getCanPreviousPage()}
						canNextPage={table.getCanNextPage()}
						onPageSelect={(pageNum) => table.setPageIndex(pageNum - 1)}
					/>
				</>
			)}
		</div>
	);
}
