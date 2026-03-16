import { t } from '@lingui/core/macro';
import { Trans } from '@lingui/react/macro';
import {
  CaretRightIcon,
  CaretUpDownIcon} from '@phosphor-icons/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import * as React from 'react';
import { ProjectCombobox } from '@/components/project/project-combobox';
import { SkillCombobox } from '@/components/skill/skill-combobox';
import { useResumeStore } from '@/components/resume/store/resume';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { orpc } from '@/integrations/orpc/client';
import { getSectionIcon, getSectionTitle } from '@/utils/resume/section';
import { cn } from '@/utils/style';
import { useSectionStore } from '../../../-store/section';

export function OverallSectionBuilder() {
  const { resumeId } = useParams({ from: '/builder/$resumeId' });
  const queryClient = useQueryClient();
  const projectId = useResumeStore((state) => state.resume.projectId);
  const resumeSkills = useResumeStore((state) => state.resume.skills);
  const resumePositionId = useResumeStore((state) => state.resume.positionId);
  const resumePosition = useResumeStore((state) => state.resume.position);
  const isLocked = useResumeStore((state) => state.resume.isLocked);
  const collapsed = useSectionStore(
    (state) => state.sections.overall?.collapsed ?? false
  );
  const toggleCollapsed = useSectionStore((state) => state.toggleCollapsed);

  const { data: project } = useQuery({
    ...orpc.project.getById.queryOptions({ input: { id: projectId ?? '' } }),
    enabled: Boolean(projectId)
  });

  const { mutateAsync: updateResume } = useMutation(
    orpc.resume.update.mutationOptions()
  );

  const invalidateResume = () => {
    return Promise.all([
      queryClient.invalidateQueries({
        queryKey: orpc.resume.getById.queryOptions({ input: { id: resumeId } })
          .queryKey
      }),
      queryClient.invalidateQueries({
        queryKey: orpc.resume.list.queryOptions({}).queryKey
      })
    ]);
  };

  const handleProjectChange = async (next: string | undefined) => {
    const nextProjectId = next ?? null;
    await updateResume({
      id: resumeId,
      projectId: nextProjectId,
      skillIds: [],
      positionId: null
    });
    await invalidateResume();
  };

  const handleSkillsChange = async (skillIds: string[]) => {
    await updateResume({
      id: resumeId,
      skillIds: skillIds
    });
    await invalidateResume();
  };

  const handlePositionChange = async (value: string | null) => {
    await updateResume({
      id: resumeId,
      positionId: value
    });
    await invalidateResume();
  };

  const positions = project?.position ?? [];

  return (
    <Accordion
      collapsible
      type="single"
      id="sidebar-overall"
      value={collapsed ? '' : 'overall'}
      onValueChange={() => toggleCollapsed('overall')}
      className="space-y-4">
      <AccordionItem value="overall" className="group/accordion space-y-4">
        <div className="flex items-center">
          <AccordionTrigger
            asChild
            className="me-2 items-center justify-center">
            <Button size="icon" variant="ghost">
              <CaretRightIcon />
            </Button>
          </AccordionTrigger>

          <div className="flex flex-1 items-center gap-x-4">
            {getSectionIcon('overall')}
            <h2 className="line-clamp-1 font-bold text-2xl tracking-tight">
              {getSectionTitle('overall')}
            </h2>
          </div>
        </div>

        <AccordionContent
          className={cn(
            'overflow-hidden pb-0 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down'
          )}>
          <div className="space-y-4">
            <div className="flex flex-col gap-y-2">
              <Label>
                <Trans>Project</Trans>
              </Label>
              <ProjectCombobox
                value={projectId ?? undefined}
                onValueChange={handleProjectChange}
                disabled={isLocked}
                clearable
                className="w-full justify-between font-normal"
              />
            </div>

            {projectId && project
              ? ((
                  <>
                    <div className="flex flex-col gap-y-2">
                      <Label>
                        <Trans>Skills Highlights</Trans>
                      </Label>
                      <SkillCombobox
                        multiple
                        value={resumeSkills?.map((s) => s.id) ?? []}
                        onChange={handleSkillsChange}
                        projectId={projectId}
                      />
                    </div>
                    <div className="flex flex-col gap-y-2">
                      <Label>
                        <Trans>Position</Trans>
                      </Label>
                      <OverallOptionSelect
                        value={resumePositionId ?? null}
                        displayLabel={resumePosition ?? null}
                        onValueChange={handlePositionChange}
                        options={positions}
                        placeholder={t`Select position`}
                        disabled={isLocked}
                        className="w-full justify-between font-normal"
                      />
                    </div>
                  </>
                ) as React.ReactNode)
              : null}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function OverallOptionSelect({
  value,
  displayLabel,
  onValueChange,
  options,
  placeholder,
  disabled,
  className
}: {
  value: string | null;
  displayLabel: string | null;
  onValueChange: (value: string | null) => void;
  options: { id: string; name: string }[];
  placeholder: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (selectedId: string) => {
    onValueChange(selectedId === value ? null : selectedId);
    setOpen(false);
  };

  const clear = () => {
    onValueChange(null);
    setOpen(false);
  };

  const display: string =
    displayLabel ?? options.find((o) => o.id === value)?.name ?? placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          variant="outline"
          aria-expanded={open}
          disabled={disabled || options.length === 0}
          className={cn('font-normal', className)}>
          <span className="truncate">{display}</span>
          <CaretUpDownIcon className="ms-2 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="min-w-[200px] p-0">
        <Command>
          <CommandList>
            {options.length === 0 ? (
              <CommandEmpty>
                <Trans>No options</Trans>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {value && (
                  <CommandItem onSelect={clear} className="cursor-pointer">
                    <Trans>Clear</Trans>
                  </CommandItem>
                )}
                {options.map((opt) => (
                  <CommandItem
                    key={opt.id}
                    value={opt.id}
                    onSelect={() => handleSelect(opt.id)}
                    className="cursor-pointer">
                    {opt.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
