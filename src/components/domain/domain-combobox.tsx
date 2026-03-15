import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { orpc, type RouterOutput } from '@/integrations/orpc/client';
import { Combobox } from '../ui/combobox';

type DomainComboboxProps = {
  value: string | null;
  onValueChange: (value: string | null) => void;
};

export function DomainCombobox({ value, onValueChange }: DomainComboboxProps) {
  const [debouncedSearch, setSearchInput] = useDebounceValue('', 300);
  const { data } = useQuery<RouterOutput['domain']['list']>(
    orpc.domain.list.queryOptions({
      input: { query: debouncedSearch.trim() || undefined }
    })
  );
  const domains = useMemo(() => data?.items ?? [], [data]);
  const domainOptions = useMemo(
    () =>
      domains.map((d: RouterOutput['domain']['list']['items'][number]) => ({
        value: d.id,
        label: d.name
      })),
    [domains]
  );

  return (
    <Combobox
      options={domainOptions}
      value={value}
      onValueChange={onValueChange}
      onSearchChange={setSearchInput}
      placeholder={t`Select domain`}
      searchPlaceholder={t`Search domains...`}
      emptyMessage={t`No domains found.`}
    />
  );
}
