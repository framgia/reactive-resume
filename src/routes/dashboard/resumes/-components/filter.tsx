import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { PositionCombobox } from "@/components/position/position-combobox";
import { ProjectCombobox } from "@/components/project/project-combobox";
import { SkillCombobox } from "@/components/skill/skill-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export type ResumeFiltersApplied = {
	projectId: string | undefined;
	projectName: string;
	skillIds: string[];
	skillNames: string[];
	positionId: string | undefined;
	positionName: string;
};

/** Single option with id + label; one source of truth for combobox selections. */
type SelectionOption = { id: string; label: string };

function toProjectSelection(
	filters: ResumeFiltersApplied,
): SelectionOption | null {
	const id = filters.projectId;
	const label = filters.projectName?.trim();
	if (!id) return null;
	return { id, label: label || id };
}

function toSkillSelections(filters: ResumeFiltersApplied): SelectionOption[] {
	return filters.skillIds.map((id, i) => ({
		id,
		label: (filters.skillNames[i] ?? id).trim() || id,
	}));
}

function toPositionSelection(
	filters: ResumeFiltersApplied,
): SelectionOption | null {
	const id = filters.positionId;
	const label = filters.positionName?.trim();
	if (!id) return null;
	return { id, label: label || id };
}

type ResumeFilterPopoverProps = {
	appliedFilters: ResumeFiltersApplied;
	onFiltersChange: (filters: ResumeFiltersApplied) => void;
	/** Current projectId from URL; used to scope skill/position lists. */
	projectIdFromUrl: string | undefined;
};

export function ResumeFilterPopover({
	appliedFilters,
	onFiltersChange,
	projectIdFromUrl,
}: ResumeFilterPopoverProps) {
	const [filterOpen, setFilterOpen] = useState(false);
	const [filterComboboxKey, setFilterComboboxKey] = useState(0);
	const [projectSelection, setProjectSelection] =
		useState<SelectionOption | null>(null);
	const [skillSelections, setSkillSelections] = useState<SelectionOption[]>([]);
	const [positionSelection, setPositionSelection] =
		useState<SelectionOption | null>(null);

	const hasActiveFilters =
		appliedFilters.projectId !== undefined ||
		appliedFilters.skillIds.length > 0 ||
		appliedFilters.positionId !== undefined;

	const handleApplyFilter = () => {
		onFiltersChange({
			projectId: projectSelection?.id,
			projectName: projectSelection?.label ?? "",
			skillIds: skillSelections.map((s) => s.id),
			skillNames: skillSelections.map((s) => s.label),
			positionId: positionSelection?.id,
			positionName: positionSelection?.label ?? "",
		});
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		setProjectSelection(null);
		setSkillSelections([]);
		setPositionSelection(null);
		onFiltersChange({
			projectId: undefined,
			projectName: "",
			skillIds: [],
			skillNames: [],
			positionId: undefined,
			positionName: "",
		});
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) {
			setProjectSelection(toProjectSelection(appliedFilters));
			setSkillSelections(toSkillSelections(appliedFilters));
			setPositionSelection(toPositionSelection(appliedFilters));
		} else {
			setFilterComboboxKey((k) => k + 1);
		}
	};

	const clearProject = () =>
		onFiltersChange({
			...appliedFilters,
			projectId: undefined,
			projectName: "",
		});
	const clearSkill = (index: number) =>
		onFiltersChange({
			...appliedFilters,
			skillIds: appliedFilters.skillIds.filter((_, i) => i !== index),
			skillNames: appliedFilters.skillNames.filter((_, i) => i !== index),
		});
	const clearPosition = () =>
		onFiltersChange({
			...appliedFilters,
			positionId: undefined,
			positionName: "",
		});

	return (
		<div className="flex flex-wrap items-center gap-x-2">
			<Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="sm" className="gap-x-2">
						<FunnelSimpleIcon
							className="size-4"
							weight={hasActiveFilters ? "fill" : "regular"}
						/>
						<Trans>Filter</Trans>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72">
					<div className="flex flex-col gap-y-3">
						<div
							key={`project-${filterComboboxKey}`}
							className="flex flex-col gap-y-2"
						>
							<Label>
								<Trans>Project</Trans>
							</Label>
							<ProjectCombobox
								value={projectSelection?.id ?? undefined}
								onValueChange={(_value, option) =>
									setProjectSelection(
										option
											? { id: option.value, label: option.label }
											: null,
									)
								}
							/>
						</div>
						<div
							key={`skill-${filterComboboxKey}`}
							className="flex flex-col gap-y-2"
						>
							<Label>
								<Trans>Skills</Trans>
							</Label>
							<SkillCombobox
								multiple
								value={skillSelections.map((s) => s.id)}
								onChange={(_, options) =>
									setSkillSelections(
										options?.map((o) => ({
											id: o.value,
											label: o.label,
										})) ?? [],
									)
								}
								projectId={projectIdFromUrl}
							/>
						</div>
						<div
							key={`position-${filterComboboxKey}`}
							className="flex flex-col gap-y-2"
						>
							<Label>
								<Trans>Position</Trans>
							</Label>
							<PositionCombobox
								value={positionSelection?.id ?? null}
								onChange={(value, label) =>
									setPositionSelection(
										value != null && label != null
											? { id: value, label }
											: null,
									)
								}
								projectId={projectIdFromUrl}
							/>
						</div>
						<div className="flex gap-x-2">
							{hasActiveFilters && (
								<Button
									variant="ghost"
									size="sm"
									className="flex-1"
									onClick={handleClearFilter}
								>
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
			{appliedFilters.projectId != null && (
				<Badge
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={clearProject}
					title={t`Project: ${appliedFilters.projectName || appliedFilters.projectId}`}
				>
					<Trans>Project</Trans>:{" "}
					{appliedFilters.projectName.trim() || appliedFilters.projectId}
				</Badge>
			)}
			{appliedFilters.skillNames.map((label, i) => (
				<Badge
					key={`skill-${appliedFilters.skillIds[i] ?? i}`}
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={() => clearSkill(i)}
					title={t`Skill: ${label}`}
				>
					<Trans>Skill</Trans>: {label}
				</Badge>
			))}
			{appliedFilters.positionId != null && (
				<Badge
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={clearPosition}
					title={t`Position: ${appliedFilters.positionName || appliedFilters.positionId}`}
				>
					<Trans>Position</Trans>:{" "}
					{appliedFilters.positionName.trim() || appliedFilters.positionId}
				</Badge>
			)}
		</div>
	);
}
