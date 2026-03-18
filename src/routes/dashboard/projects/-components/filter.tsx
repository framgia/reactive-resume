import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { CustomerCombobox } from "@/components/customer/customer-combobox";
import { DomainCombobox } from "@/components/domain/domain-combobox";
import { PositionCombobox } from "@/components/position/position-combobox";
import { SkillCombobox } from "@/components/skill/skill-combobox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ProjectFiltersApplied = {
	name: string;
	customerId: string | null;
	domainIds: string[];
	skillIds: string[];
	positionId: string | null;
	positionName: string;
	domainNames: string[];
	skillNames: string[];
};

const emptyFilters: ProjectFiltersApplied = {
	name: "",
	customerId: null,
	domainIds: [],
	skillIds: [],
	positionId: null,
	positionName: "",
	domainNames: [],
	skillNames: [],
};

/** Single option with id + label; one source of truth for combobox selections. */
type SelectionOption = { id: string; label: string };

function toDomainSelection(filters: ProjectFiltersApplied): SelectionOption | null {
	const id = filters.domainIds[0] ?? null;
	const label = filters.domainNames[0]?.trim();
	if (!id) return null;
	return { id, label: label || id };
}

function toSkillSelections(filters: ProjectFiltersApplied): SelectionOption[] {
	return filters.skillIds.map((id, i) => ({
		id,
		label: (filters.skillNames[i] ?? id).trim() || id,
	}));
}

function toPositionSelection(filters: ProjectFiltersApplied): SelectionOption | null {
	const id = filters.positionId;
	const label = filters.positionName?.trim();
	if (!id) return null;
	return { id, label: label || id };
}

type ProjectFilterPopoverProps = {
	appliedFilters: ProjectFiltersApplied;
	onFiltersChange: (filters: ProjectFiltersApplied) => void;
};

export function ProjectFilterPopover({ appliedFilters, onFiltersChange }: ProjectFilterPopoverProps) {
	const [filterOpen, setFilterOpen] = useState(false);
	const [filterComboboxKey, setFilterComboboxKey] = useState(0);
	const [nameInput, setNameInput] = useState("");
	const [customerSelection, setCustomerSelection] = useState<SelectionOption | null>(null);
	const [domainSelection, setDomainSelection] = useState<SelectionOption | null>(null);
	const [skillSelections, setSkillSelections] = useState<SelectionOption[]>([]);
	const [positionSelection, setPositionSelection] = useState<SelectionOption | null>(null);

	const hasActiveFilters = Boolean(
		appliedFilters.name.trim() ||
			appliedFilters.customerId !== null ||
			appliedFilters.domainIds.length > 0 ||
			appliedFilters.skillIds.length > 0 ||
			appliedFilters.positionId != null,
	);

	const handleApplyFilter = () => {
		onFiltersChange({
			name: nameInput,
			customerId: customerSelection?.id ?? null,
			domainIds: domainSelection ? [domainSelection.id] : [],
			domainNames: domainSelection ? [domainSelection.label] : [],
			skillIds: skillSelections.map((s) => s.id),
			skillNames: skillSelections.map((s) => s.label),
			positionId: positionSelection?.id ?? null,
			positionName: positionSelection?.label ?? "",
		});
		setFilterOpen(false);
	};

	const handleClearFilter = () => {
		setNameInput("");
		setCustomerSelection(null);
		setDomainSelection(null);
		setSkillSelections([]);
		setPositionSelection(null);
		onFiltersChange(emptyFilters);
		setFilterOpen(false);
	};

	const handleFilterOpenChange = (open: boolean) => {
		setFilterOpen(open);
		if (open) {
			setNameInput(appliedFilters.name);
			setCustomerSelection(
				appliedFilters.customerId
					? { id: appliedFilters.customerId, label: appliedFilters.customerName || appliedFilters.customerId }
					: null,
			);
			setDomainSelection(toDomainSelection(appliedFilters));
			setSkillSelections(toSkillSelections(appliedFilters));
			setPositionSelection(toPositionSelection(appliedFilters));
		} else {
			setFilterComboboxKey((k) => k + 1);
		}
	};

	const clearName = () => onFiltersChange({ ...appliedFilters, name: "" });
	const clearCustomer = () =>
		onFiltersChange({ ...appliedFilters, customerId: null });
	const clearDomain = (index: number) =>
		onFiltersChange({
			...appliedFilters,
			domainIds: appliedFilters.domainIds.filter((_, i) => i !== index),
			domainNames: appliedFilters.domainNames.filter((_, i) => i !== index),
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
			positionId: null,
			positionName: "",
		});

	return (
		<div className="flex flex-wrap items-center gap-x-2">
			<Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="sm" className="gap-x-2">
						<FunnelSimpleIcon className="size-4" weight={hasActiveFilters ? "fill" : "regular"} />
						<Trans>Filter</Trans>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72">
					<div className="flex flex-col gap-y-3">
						<div className="flex flex-col gap-y-2">
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
						<div className="flex flex-col gap-y-2">
							<Label htmlFor="filter-customer">
								<Trans>Customer</Trans>
							</Label>
							<CustomerCombobox
								value={customerSelection?.id ?? null}
								onChange={(value, label) =>
									setCustomerSelection(
										value != null && label != null ? { id: value, label } : null,
									)
								}
							/>
						</div>
						<div key={`domain-${filterComboboxKey}`} className="flex flex-col gap-y-2">
							<Label>
								<Trans>Domains</Trans>
							</Label>
							<DomainCombobox
								value={domainSelection?.id ?? null}
								onValueChange={(_, option) =>
									setDomainSelection(option ? { id: option.value, label: option.label } : null)
								}
							/>
						</div>
						<div key={`skill-${filterComboboxKey}`} className="flex flex-col gap-y-2">
							<Label>
								<Trans>Skills</Trans>
							</Label>
							<SkillCombobox
								multiple
								value={skillSelections.map((s) => s.id)}
								onChange={(_, options) =>
									setSkillSelections(options?.map((o) => ({ id: o.value, label: o.label })) ?? [])
								}
							/>
						</div>
						<div key={`position-${filterComboboxKey}`} className="flex flex-col gap-y-2">
							<Label>
								<Trans>Position</Trans>
							</Label>
							<PositionCombobox
								value={positionSelection?.id ?? null}
								onChange={(value, label) =>
									setPositionSelection(value != null && label != null ? { id: value, label } : null)
								}
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
			{appliedFilters.name.trim() && (
				<Badge
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={clearName}
					title={t`Project name: ${appliedFilters.name}`}
				>
					<Trans>Name</Trans>: {appliedFilters.name}
				</Badge>
			)}
			{appliedFilters.customerId && (
				<Badge
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={clearCustomer}
					title={t`Customer filter applied`}
				>
					<Trans>Customer</Trans>
				</Badge>
			)}
			{appliedFilters.domainNames.map((label, i) => (
				<Badge
					key={`domain-${appliedFilters.domainIds[i] ?? i}`}
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={() => clearDomain(i)}
					title={t`Domain: ${label}`}
				>
					<Trans>Domain</Trans>: {label}
				</Badge>
			))}
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
			{appliedFilters.positionName.trim() && (
				<Badge
					variant="outline"
					className="max-w-48 cursor-pointer truncate"
					onClick={clearPosition}
					title={t`Position: ${appliedFilters.positionName}`}
				>
					<Trans>Position</Trans>: {appliedFilters.positionName}
				</Badge>
			)}
		</div>
	);
}
