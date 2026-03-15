import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { orpc } from '@/integrations/orpc/client';
import { MultipleCombobox } from '../ui/multiple-combobox';
import { cn } from '@/utils/style';

type SkillComboboxProps = {
  value: string[];
  onChange: (value: string[]) => void;
  projectId?: string;
};

export function SkillCombobox({
  value,
  onChange,
  projectId,
}: SkillComboboxProps) {
  const [debouncedSearch, setSearchInput] = useDebounceValue('', 300);
  const { data } = useQuery(
    orpc.skill.list.queryOptions({
      input: { query: debouncedSearch.trim() || undefined, projectId }
    })
  );

  const skills = useMemo(() => data?.items ?? [], [data]);
  const skillOptions = useMemo(
    () => skills.map((s) => ({ value: s.id, label: s.name })),
    [skills]
  );

  return (
    <MultipleCombobox
      options={skillOptions}
      value={value}
      onValueChange={onChange}
      onSearchChange={setSearchInput}
      placeholder={t`Select skills`}
      searchPlaceholder={t`Search skills...`}
      emptyMessage={t`No skills found.`}
      className={cn('w-full')}
    />
  );
}
