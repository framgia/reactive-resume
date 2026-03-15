import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import { FunnelSimpleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { DomainCombobox } from '@/components/domain/domain-combobox';
import { PositionCombobox } from '@/components/position/position-combobox';
import { SkillCombobox } from '@/components/skill/skill-combobox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';

export type ProjectFiltersApplied = {
  name: string;
  customerName: string;
  domainIds: string[];
  skillIds: string[];
  positionId: string | null;
  positionName: string;
  domainNames: string[];
  skillNames: string[];
};

const emptyFilters: ProjectFiltersApplied = {
  name: '',
  customerName: '',
  domainIds: [],
  skillIds: [],
  positionId: null,
  positionName: '',
  domainNames: [],
  skillNames: []
};

type ProjectFilterPopoverProps = {
  appliedFilters: ProjectFiltersApplied;
  onFiltersChange: (filters: ProjectFiltersApplied) => void;
};

export function ProjectFilterPopover({
  appliedFilters,
  onFiltersChange
}: ProjectFilterPopoverProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterComboboxKey, setFilterComboboxKey] = useState(0);
  const [nameInput, setNameInput] = useState('');
  const [customerInput, setCustomerInput] = useState('');
  const [domainInput, setDomainInput] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState<string[]>([]);
  const [positionInput, setPositionInput] = useState<string | null>(null);
  const [positionNameInput, setPositionNameInput] = useState('');

  const getDomainLabelRef = useRef<((id: string) => string) | undefined>(
    undefined
  );
  const getSkillLabelRef = useRef<((id: string) => string) | undefined>(
    undefined
  );

  const hasActiveFilters = Boolean(
    appliedFilters.name.trim() ||
    appliedFilters.customerName.trim() ||
    appliedFilters.domainIds.length > 0 ||
    appliedFilters.skillIds.length > 0 ||
    appliedFilters.positionId != null
  );

  const filterBadges = [
    ...(appliedFilters.name.trim()
      ? [{ label: t`Name`, value: appliedFilters.name.trim() }]
      : []),
    ...(appliedFilters.customerName.trim()
      ? [{ label: t`Customer`, value: appliedFilters.customerName.trim() }]
      : []),
    ...(appliedFilters.domainIds.length > 0
      ? [{ label: t`Domains`, value: appliedFilters.domainNames.join(', ') }]
      : []),
    ...(appliedFilters.skillIds.length > 0
      ? [{ label: t`Skills`, value: appliedFilters.skillNames.join(', ') }]
      : []),
    ...(appliedFilters.positionId != null && appliedFilters.positionName.trim()
      ? [
          {
            label: t`Position`,
            value: appliedFilters.positionName.trim()
          }
        ]
      : [])
  ];

  const handleApplyFilter = () => {
    onFiltersChange({
      name: nameInput,
      customerName: customerInput,
      domainIds: domainInput,
      skillIds: skillInput,
      positionId: positionInput,
      positionName: positionNameInput.trim(),
      domainNames: domainInput.map(
        (id) => getDomainLabelRef.current?.(id) ?? id
      ),
      skillNames: skillInput.map((id) => getSkillLabelRef.current?.(id) ?? id)
    });
    setFilterOpen(false);
  };

  const handleClearFilter = () => {
    setNameInput('');
    setCustomerInput('');
    setDomainInput([]);
    setSkillInput([]);
    setPositionInput(null);
    setPositionNameInput('');
    onFiltersChange(emptyFilters);
    setFilterOpen(false);
  };

  const handleFilterOpenChange = (open: boolean) => {
    setFilterOpen(open);
    if (open) {
      setNameInput(appliedFilters.name);
      setCustomerInput(appliedFilters.customerName);
      setDomainInput(appliedFilters.domainIds);
      setSkillInput(appliedFilters.skillIds);
      setPositionInput(appliedFilters.positionId);
      setPositionNameInput(appliedFilters.positionName);
    } else {
      setFilterComboboxKey((k) => k + 1);
    }
  };

  return (
    <Popover open={filterOpen} onOpenChange={handleFilterOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-x-2">
          <FunnelSimpleIcon className="size-4" />
          <Trans>Filter</Trans>
          {filterBadges.map((badge) => (
            <Badge
              key={badge.label}
              variant="secondary"
              className="max-w-32 shrink-0 truncate px-1.5 py-0 font-normal text-[10px]">
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
          <div
            key={`domain-${filterComboboxKey}`}
            className="flex flex-col gap-y-2">
            <Label>
              <Trans>Domains</Trans>
            </Label>
            <DomainCombobox value={domainInput} onChange={setDomainInput} />
          </div>
          <div
            key={`skill-${filterComboboxKey}`}
            className="flex flex-col gap-y-2">
            <Label>
              <Trans>Skills</Trans>
            </Label>
            <SkillCombobox value={skillInput} onChange={setSkillInput} />
          </div>
          <div
            key={`position-${filterComboboxKey}`}
            className="flex flex-col gap-y-2">
            <Label>
              <Trans>Position</Trans>
            </Label>
            <PositionCombobox
              value={positionInput}
              onChange={(value, label) => {
                setPositionInput(value);
                setPositionNameInput(label ?? '');
              }}
            />
          </div>
          <div className="flex gap-x-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={handleClearFilter}>
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
  );
}
