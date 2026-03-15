import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useDebounceValue } from 'usehooks-ts';
import { Combobox } from '@/components/ui/combobox';
import { orpc } from '@/integrations/orpc/client';

const POSITION_LIST_LIMIT = 50;

type PositionSelectProps = {
  value: string | null;
  onChange: (value: string | null, label?: string) => void;
  disabled?: boolean;
  projectId?: string;
};

export function PositionCombobox({
  value,
  onChange,
  disabled = false,
  projectId,
}: PositionSelectProps) {
  const [debouncedSearch, setSearchInput] = useDebounceValue('', 300);
  const { data } = useQuery(
    orpc.position.list.queryOptions({
      input: {
        query: debouncedSearch.trim() || undefined,
        limit: POSITION_LIST_LIMIT,
        projectId,
      },
    })
  );
  const positions: { id: string; name: string }[] =
    (data as { items?: { id: string; name: string }[] } | undefined)?.items ?? [];
  const options = positions.map((p) => ({ value: p.id, label: p.name }));

  return (
    <Combobox
      options={options}
      value={value}
      onValueChange={(_, option) =>
        onChange(
          option?.value ?? null,
          option?.label != null ? String(option.label) : undefined
        )}
      onSearchChange={setSearchInput}
      placeholder={t`Select position`}
      searchPlaceholder={t`Search positions...`}
      emptyMessage={t`No positions found.`}
      disabled={disabled}
      clearable
    />
  );
}
