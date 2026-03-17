import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useDebounceValue } from 'usehooks-ts';
import { orpc, type RouterOutput } from '@/integrations/orpc/client';
import { Combobox } from '../ui/combobox';
import { MultipleCombobox } from '../ui/multiple-combobox';

type DomainComboboxPropsBase = {
  multiple?: boolean;
};

type DomainOption = { value: string; label: string };

type DomainComboboxPropsSingle = DomainComboboxPropsBase & {
  multiple?: false;
  value: string | null;
  onValueChange: (value: string | null, option?: DomainOption | null) => void;
};

type DomainComboboxPropsMultiple = DomainComboboxPropsBase & {
  multiple: true;
  value: string[];
  onValueChange: (value: string[]) => void;
};

type DomainComboboxProps = DomainComboboxPropsSingle | DomainComboboxPropsMultiple;

export function DomainCombobox(props: DomainComboboxProps) {
  const { multiple = false } = props;
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

  if (multiple) {
    const { value, onValueChange } = props as DomainComboboxPropsMultiple;
    return (
      <MultipleCombobox
        options={domainOptions}
        value={value}
        onValueChange={onValueChange}
        onSearchChange={setSearchInput}
        placeholder={t`Select domains`}
        searchPlaceholder={t`Search domains...`}
        emptyMessage={t`No domains found.`}
      />
    );
  }

  const { value, onValueChange } = props as DomainComboboxPropsSingle;
  return (
    <Combobox
      options={domainOptions}
      value={value}
      onValueChange={(v, option) =>
        onValueChange(v, option ? { value: option.value, label: String(option.label) } : null)
      }
      onSearchChange={setSearchInput}
      placeholder={t`Select domain`}
      searchPlaceholder={t`Search domains...`}
      emptyMessage={t`No domains found.`}
    />
  );
}
