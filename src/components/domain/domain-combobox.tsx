import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { orpc } from '@/integrations/orpc/client';
import { MultipleCombobox } from '../ui/multiple-combobox';

type DomainComboboxProps = {
  value: string[];
  onChange: (value: string[]) => void;
};

export function DomainCombobox({ value, onChange }: DomainComboboxProps) {
  const [debouncedSearch, setSearchInput] = useDebounceValue('', 300);
  const { data } = useQuery(
    orpc.domain.list.queryOptions({
      input: { query: debouncedSearch.trim() || undefined }
    })
  );
  const domains = useMemo(() => data?.items ?? [], [data]);
  const domainOptions = useMemo(
    () => domains.map((d) => ({ value: d.id, label: d.name })),
    [domains]
  );

  return (
    <MultipleCombobox
      options={domainOptions}
      value={value}
      onValueChange={onChange}
      onSearchChange={setSearchInput}
      placeholder={t`Select domains`}
      searchPlaceholder={t`Search domains...`}
      emptyMessage={t`No domains found.`}
    />
  );
}
