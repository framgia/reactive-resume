import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { CaretUpDownIcon } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { orpc } from '@/integrations/orpc/client';
import { cn } from '@/utils/style';
import { Combobox } from '../ui/combobox';
import { MultipleCombobox } from '../ui/multiple-combobox';

type SkillComboboxPropsBase = {
  projectId?: string;
  multiple?: boolean;
};

type SkillComboboxPropsSingle = SkillComboboxPropsBase & {
  multiple?: false;
  value: string | null;
  onChange: (value: string | null) => void;
};

type SkillOption = { value: string; label: string };

type SkillComboboxPropsMultiple = SkillComboboxPropsBase & {
  multiple: true;
  value: string[];
  onChange: (value: string[], options?: SkillOption[]) => void;
};

type SkillComboboxProps = SkillComboboxPropsSingle | SkillComboboxPropsMultiple;

export function SkillCombobox(props: SkillComboboxProps) {
  const { projectId, multiple = false } = props;
  const [debouncedSearch, setSearchInput] = useDebounceValue('', 300);
  const { data } = useQuery(
    orpc.skill.list.queryOptions({
      input: { query: debouncedSearch.trim() || undefined, projectId }
    })
  );

  const skills = useMemo(() => (data as { items?: { id: string; name: string }[] } | undefined)?.items ?? [], [data]);
  const skillOptions = useMemo(
    () => skills.map((s: { id: string; name: string }) => ({ value: s.id, label: s.name })),
    [skills]
  );

  if (multiple) {
    const { value: multiValue, onChange: multiOnChange } = props as SkillComboboxPropsMultiple;
    return (
      <MultipleCombobox
        options={skillOptions}
        value={multiValue}
        onValueChange={(values, options) =>
          multiOnChange(
            values,
            options.map((o) => ({ value: o.value, label: String(o.label) }))
          )
        }
        onSearchChange={setSearchInput}
        placeholder={t`Select skills`}
        searchPlaceholder={t`Search skills...`}
        emptyMessage={t`No skills found.`}
        className={cn('w-full')}
        buttonProps={{
          className: 'w-full justify-between gap-2',
          children: (_values, selectedOptions) => (
            <div className="flex w-full items-center justify-between gap-2">
              <div className="flex min-h-5 flex-1 flex-wrap items-center gap-1 text-left">
                {selectedOptions.length ? (
                  selectedOptions.map((option) => (
                    <Badge key={String(option.value)} variant="outline" className="max-w-full">
                      <span className="truncate">{option.label}</span>
                    </Badge>
                  ))
                ) : (
                  <span className="truncate text-muted-foreground">{t`Select skills`}</span>
                )}
              </div>
              <CaretUpDownIcon aria-hidden className="ms-2 shrink-0 opacity-50" />
            </div>
          )
        }}
      />
    );
  }

  const { value: singleValue, onChange: singleOnChange } = props as SkillComboboxPropsSingle;
  return (
    <Combobox
      options={skillOptions}
      value={singleValue}
      onValueChange={(v) => singleOnChange(v)}
      onSearchChange={setSearchInput}
      placeholder={t`Select skill`}
      searchPlaceholder={t`Search skills...`}
      emptyMessage={t`No skills found.`}
      className={cn('w-full')}
    />
  );
}
