import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { FunnelSimpleIcon, GridFourIcon, ListIcon, ReadCvLogoIcon, SortAscendingIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo, useRef, useState } from "react";
import z from "zod";
import { PositionCombobox } from "@/components/position/position-combobox";
import { ProjectCombobox } from "@/components/project/project-combobox";
import { SkillCombobox } from "@/components/skill/skill-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";
import { GridView } from "./-components/grid-view";
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

	const [filterOpen, setFilterOpen] = useState(false);
	const [filterComboboxKey, setFilterComboboxKey] = useState(0);
	const [projectInput, setProjectInput] = useState<string | undefined>(undefined);
	const [skillInput, setSkillInput] = useState<string[]>([]);
	const [positionInput, setPositionInput] = useState<string | null>(null);

	const getSkillLabelRef = useRef<((id: string) => string) | undefined>(undefined);
	const getPositionLabelRef = useRef<((id: string) => string) | undefined>(undefined);

	const [appliedSkillNames, setAppliedSkillNames] = useState<string[]>([]);
	const [appliedPositionName, setAppliedPositionName] = useState("");

	const listProjectId = projectId;
	const listPositionId = positionId;

	const { data: resumes } = useQuery(
		orpc.resume.list.queryOptions({
			input: {
				sort,
				projectId: listProjectId,
				skillIds,
				positionId: listPositionId,
			},
		}),
	);

	const isProjectIdValid = Boolean(projectId);
	const { data: project, isPending: isProjectLoading } = useQuery({
		...orpc.project.getById.queryOptions({ input: { id: projectId ?? "" } }),
		enabled: Boolean(isProjectIdValid && projectId),
	});

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

	const hasActiveFilters = projectId !== undefined || skillIds.length > 0 || positionId !== undefined;

	const filterBadges = useMemo(() => {
		const items: { label: string; value: string }[] = [];
		if (projectId !== undefined) {
			const projectLabel = isProjectLoading ? t`Loading...` : (project?.name ?? projectId);
			items.push({ label: t`Project`, value: projectLabel });
		}
		if (skillIds.length > 0) {
			items.push({
				label: t`Skills`,
				value: appliedSkillNames.length > 0 ? appliedSkillNames.join(", ") : t`${skillIds.length} selected`,
			});
		}
		if (positionId !== undefined) {
			items.push({
				label: t`Level`,
				value: appliedPositionName,
			});
		}
		return items;
	}, [projectId, isProjectLoading, project?.name, skillIds.length, appliedSkillNames, positionId, appliedPositionName]);

	const handleApplyFilter = () => {
		const resolvedProjectId = projectInput;
		updateSearch({
			projectId: resolvedProjectId,
			skillIds: skillInput,
			positionId: positionInput ?? undefined,
		});
		setAppliedSkillNames(skillInput.map((id) => getSkillLabelRef.current?.(id) ?? id));
		setAppliedPositionName(positionInput ? (getPositionLabelRef.current?.(positionInput) ?? positionInput) : "");
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		updateSearch({
			projectId: undefined,
			skillIds: [],
			positionId: undefined,
		});
		setProjectInput(undefined);
		setSkillInput([]);
		setPositionInput(null);
		setAppliedSkillNames([]);
		setAppliedPositionName("");
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) {
			setProjectInput(projectId);
			setSkillInput(skillIds);
			setPositionInput(positionId ?? null);
		} else {
			setFilterComboboxKey((k) => k + 1);
		}
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={ReadCvLogoIcon} title={t`Resumes`} />

			<Separator />

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
				<Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
					<PopoverTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-x-2">
							<FunnelSimpleIcon className="size-4" />
							<Trans>Filter</Trans>
							{filterBadges.map((badge) => (
								<Badge
									key={badge.label}
									variant="secondary"
									className="max-w-32 shrink-0 truncate px-1.5 py-0 font-normal text-[10px]"
								>
									{badge.label}: {badge.value}
								</Badge>
							))}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-72">
						<div className="flex flex-col gap-y-3">
							<div key={`project-${filterComboboxKey}`} className="flex flex-col gap-y-2">
								<Label>
									<Trans>Project</Trans>
								</Label>
								<ProjectCombobox value={projectInput} onValueChange={(next) => setProjectInput(next ?? undefined)} />
							</div>
							<div key={`skill-${filterComboboxKey}`} className="flex flex-col gap-y-2">
								<Label>
									<Trans>Skills</Trans>
								</Label>
								<SkillCombobox value={skillInput} onChange={setSkillInput} projectId={projectId} />
							</div>
							<div key={`position-${filterComboboxKey}`} className="flex flex-col gap-y-2">
								<Label>
									<Trans>Position</Trans>
								</Label>
								<PositionCombobox
									value={positionInput}
									onChange={(value) => setPositionInput(value)}
									projectId={projectId}
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

			{view === "list" ? <ListView resumes={resumes ?? []} /> : <GridView resumes={resumes ?? []} />}
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
