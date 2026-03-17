import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { GridFourIcon, ListIcon, ReadCvLogoIcon, SortAscendingIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import z from "zod";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";
import { GridView } from "./-components/grid-view";
import {
	type ResumeFiltersApplied,
	ResumeFilterPopover,
} from "./-components/filter";
import { ListView } from "./-components/list-view";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
	projectId: z.uuid().optional(),
	skillIds: z.array(z.uuid()).default([]),
	positionId: z.uuid().optional(),
});

export const Route = createFileRoute("/dashboard/resumes/")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	search: {
		middlewares: [stripSearchParams({ sort: "lastUpdatedAt", skillIds: [], positionId: undefined })],
	},
	loader: async () => {
		const view = await getViewServerFn();
		return { view };
	},
});

function RouteComponent() {
	const router = useRouter();
	const { i18n } = useLingui();
	const { view } = Route.useLoaderData();
	const { sort, projectId, skillIds, positionId } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const [appliedFilters, setAppliedFilters] = useState<ResumeFiltersApplied>(
		() => ({
			projectId,
			projectName: "",
			skillIds,
			skillNames: [],
			positionId,
			positionName: "",
		}),
	);

	useEffect(() => {
		setAppliedFilters((prev) => ({
			...prev,
			projectId,
			skillIds,
			positionId,
			// Keep names when ids still match
			projectName:
				prev.projectId === projectId ? prev.projectName : "",
			skillNames:
				prev.skillIds.length === skillIds.length &&
				prev.skillIds.every((id, i) => id === skillIds[i])
					? prev.skillNames
					: [],
			positionName:
				prev.positionId === positionId ? prev.positionName : "",
		}));
	}, [projectId, skillIds, positionId]);

	const { data: resumes } = useQuery(
		orpc.resume.list.queryOptions({
			input: {
				sort,
				projectId,
				skillIds,
				positionId,
			},
		}),
	);

	const sortOptions = useMemo(() => {
		return [
			{ value: "lastUpdatedAt", label: i18n.t("Last Updated") },
			{ value: "createdAt", label: i18n.t("Created") },
			{ value: "name", label: i18n.t("Name") },
		];
	}, [i18n]);

	const onViewChange = (value: string) => {
		setViewServerFn({ data: value as "grid" | "list" });
		router.invalidate();
	};

	const updateSearch = (updates: Partial<z.infer<typeof searchSchema>>) => {
		navigate({ search: { sort, projectId, skillIds, positionId, ...updates } });
	};

	const handleFiltersChange = (filters: ResumeFiltersApplied) => {
		setAppliedFilters(filters);
		updateSearch({
			projectId: filters.projectId,
			skillIds: filters.skillIds,
			positionId: filters.positionId,
		});
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={ReadCvLogoIcon} title={t`Resumes`} />

			<Separator />

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<ResumeFilterPopover
					appliedFilters={appliedFilters}
					onFiltersChange={handleFiltersChange}
					projectIdFromUrl={projectId}
				/>

				<Combobox
					value={sort}
					options={sortOptions}
					onValueChange={(value) => {
						if (!value) return;
						updateSearch({ sort: value as SortOption });
					}}
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

				<Tabs className="ltr:ms-auto rtl:me-auto" value={view} onValueChange={onViewChange}>
					<TabsList>
						<TabsTrigger value="grid" className="rounded-r-none">
							<GridFourIcon />
							<Trans>Grid</Trans>
						</TabsTrigger>
						<TabsTrigger value="list" className="rounded-l-none">
							<ListIcon />
							<Trans>List</Trans>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			</div>

			{view === "list" ? (
				<ListView resumes={(resumes ?? []) as RouterOutput["resume"]["list"]} />
			) : (
				<GridView resumes={(resumes ?? []) as RouterOutput["resume"]["list"]} />
			)}
		</div>
	);
}

const RESUMES_VIEW_COOKIE_NAME = "resumes_view";

const viewSchema = z.enum(["grid", "list"]).catch("grid");

const setViewServerFn = createServerFn({ method: "POST" })
	.inputValidator(viewSchema)
	.handler(async ({ data }) => {
		setCookie(RESUMES_VIEW_COOKIE_NAME, JSON.stringify(data));
	});

const getViewServerFn = createServerFn({ method: "GET" }).handler(async () => {
	const view = getCookie(RESUMES_VIEW_COOKIE_NAME);
	if (!view) return "grid";
	return viewSchema.parse(JSON.parse(view));
});
