import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
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

type SkillComboboxPropsMultiple = SkillComboboxPropsBase & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
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
        onValueChange={multiOnChange}
        onSearchChange={setSearchInput}
        placeholder={t`Select skills`}
        searchPlaceholder={t`Search skills...`}
        emptyMessage={t`No skills found.`}
        className={cn('w-full')}
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
