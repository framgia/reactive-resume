import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { FolderIcon, FunnelSimpleIcon, SortAscendingIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useRef, useMemo, useState } from "react";
import z from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { DomainCombobox } from "@/components/domain/domain-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PositionCombobox } from "@/components/position/position-combobox";
import { SkillCombobox } from "@/components/skill/skill-combobox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";
import { ListView } from "./-components/list-view";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
	sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
});

export const Route = createFileRoute("/dashboard/projects/")({
	component: RouteComponent,
	validateSearch: zodValidator(searchSchema),
	search: {
		middlewares: [stripSearchParams({ sort: "lastUpdatedAt" })],
	},
});

function RouteComponent() {
	const { i18n } = useLingui();
	const { sort } = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const [filterOpen, setFilterOpen] = useState(false);
	const [filterComboboxKey, setFilterComboboxKey] = useState(0);
	const [nameInput, setNameInput] = useState("");
	const [customerInput, setCustomerInput] = useState("");
	const [domainInput, setDomainInput] = useState<string[]>([]);
	const [skillInput, setSkillInput] = useState<string[]>([]);
	const [positionInput, setPositionInput] = useState<string[]>([]);
	const [appliedName, setAppliedName] = useState("");
	const [appliedCustomerName, setAppliedCustomerName] = useState("");
	const [appliedDomainIds, setAppliedDomainIds] = useState<string[]>([]);
	const [appliedSkillIds, setAppliedSkillIds] = useState<string[]>([]);
	const [appliedPositionIds, setAppliedPositionIds] = useState<string[]>([]);

	const getDomainLabelRef = useRef<((id: string) => string) | undefined>(undefined);
	const getSkillLabelRef = useRef<((id: string) => string) | undefined>(undefined);
	const getPositionLabelRef = useRef<((id: string) => string) | undefined>(undefined);

	const [appliedDomainNames, setAppliedDomainNames] = useState<string[]>([]);
	const [appliedSkillNames, setAppliedSkillNames] = useState<string[]>([]);
	const [appliedPositionNames, setAppliedPositionNames] = useState<string[]>([]);

	const { data: projects } = useQuery(
		orpc.project.list.queryOptions({
			input: {
				sort,
				name: appliedName?.trim() || undefined,
				customerName: appliedCustomerName?.trim() || undefined,
				domainIds: appliedDomainIds.length > 0 ? appliedDomainIds : undefined,
				skillIds: appliedSkillIds.length > 0 ? appliedSkillIds : undefined,
				positionIds: appliedPositionIds.length > 0 ? appliedPositionIds : undefined,
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

	const hasActiveFilters = Boolean(
		appliedName.trim() ||
			appliedCustomerName.trim() ||
			appliedDomainIds.length > 0 ||
			appliedSkillIds.length > 0 ||
			appliedPositionIds.length > 0,
	);

	const filterBadges = useMemo(() => {
		const items: { label: string; value: string }[] = [];
		if (appliedName.trim()) items.push({ label: t`Name`, value: appliedName.trim() });
		if (appliedCustomerName.trim()) items.push({ label: t`Customer`, value: appliedCustomerName.trim() });
		if (appliedDomainIds.length > 0) items.push({ label: t`Domains`, value: appliedDomainNames.join(", ") });
		if (appliedSkillIds.length > 0) items.push({ label: t`Skills`, value: appliedSkillNames.join(", ") });
		if (appliedPositionIds.length > 0) items.push({ label: t`Positions`, value: appliedPositionNames.join(", ") });
		return items;
	}, [
		appliedName,
		appliedCustomerName,
		appliedDomainIds.length,
		appliedDomainNames,
		appliedSkillIds.length,
		appliedSkillNames,
		appliedPositionIds.length,
		appliedPositionNames,
	]);

	const handleApplyFilter = () => {
		setAppliedName(nameInput);
		setAppliedCustomerName(customerInput);
		setAppliedDomainIds(domainInput);
		setAppliedSkillIds(skillInput);
		setAppliedPositionIds(positionInput);
		setAppliedDomainNames(domainInput.map((id) => getDomainLabelRef.current?.(id) ?? id));
		setAppliedSkillNames(skillInput.map((id) => getSkillLabelRef.current?.(id) ?? id));
		setAppliedPositionNames(positionInput.map((id) => getPositionLabelRef.current?.(id) ?? id));
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		setNameInput("");
		setCustomerInput("");
		setDomainInput([]);
		setSkillInput([]);
		setPositionInput([]);
		setAppliedName("");
		setAppliedCustomerName("");
		setAppliedDomainIds([]);
		setAppliedSkillIds([]);
		setAppliedPositionIds([]);
		setAppliedDomainNames([]);
		setAppliedSkillNames([]);
		setAppliedPositionNames([]);
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) {
			setNameInput(appliedName);
			setCustomerInput(appliedCustomerName);
			setDomainInput(appliedDomainIds);
			setSkillInput(appliedSkillIds);
			setPositionInput(appliedPositionIds);
		} else {
			setFilterComboboxKey((k) => k + 1);
		}
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={FolderIcon} title={t`Projects`} />

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
							<div className="space-y-2">
								<Label htmlFor="filter-name">
									<Trans>Project name</Trans>
								</Label>
								<Input
									id="filter-name"
									type="text"
									placeholder={t`Filter by name`}
									value={nameInput}
									onChange={(e) => setNameInput(e.target.value)}
									className="h-9"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="filter-customer">
									<Trans>Customer</Trans>
								</Label>
								<Input
									id="filter-customer"
									type="text"
									placeholder={t`Filter by customer`}
									value={customerInput}
									onChange={(e) => setCustomerInput(e.target.value)}
									className="h-9"
								/>
							</div>
							<div key={`domain-${filterComboboxKey}`}>
								<DomainCombobox
									value={domainInput}
									onChange={setDomainInput}
									appliedIds={appliedDomainIds}
									getLabelRef={getDomainLabelRef}
								/>
							</div>
							<div key={`skill-${filterComboboxKey}`}>
								<SkillCombobox
									value={skillInput}
									onChange={setSkillInput}
									appliedIds={appliedSkillIds}
									getLabelRef={getSkillLabelRef}
								/>
							</div>
							<div key={`position-${filterComboboxKey}`}>
								<PositionCombobox
									value={positionInput}
									onChange={setPositionInput}
									appliedIds={appliedPositionIds}
									getLabelRef={getPositionLabelRef}
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
						navigate({ search: { sort: value as SortOption } });
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

			<ListView projects={(projects ?? []) as RouterOutput["project"]["list"]} />
		</div>
	);
}
