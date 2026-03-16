import { t } from '@lingui/core/macro';
import { useQuery } from '@tanstack/react-query';
import { useDebounceValue } from 'usehooks-ts';
import { Combobox } from '@/components/ui/combobox';
import { MultipleCombobox } from '@/components/ui/multiple-combobox';
import { orpc } from '@/integrations/orpc/client';

const POSITION_LIST_LIMIT = 50;

type PositionComboboxPropsBase = {
  disabled?: boolean;
  projectId?: string;
  multiple?: boolean;
};

type PositionComboboxPropsSingle = PositionComboboxPropsBase & {
  multiple?: false;
  value: string | null;
  onChange: (value: string | null, label?: string) => void;
};

type PositionComboboxPropsMultiple = PositionComboboxPropsBase & {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
};

type PositionComboboxProps = PositionComboboxPropsSingle | PositionComboboxPropsMultiple;

export function PositionCombobox(props: PositionComboboxProps) {
  const { disabled = false, projectId, multiple = false } = props;
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

  if (multiple) {
    const { value: multiValue, onChange: multiOnChange } = props as PositionComboboxPropsMultiple;
    return (
      <MultipleCombobox
        options={options}
        value={multiValue}
        onValueChange={multiOnChange}
        onSearchChange={setSearchInput}
        placeholder={t`Select positions`}
        searchPlaceholder={t`Search positions...`}
        emptyMessage={t`No positions found.`}
      />
    );
  }

  const { value: singleValue, onChange: singleOnChange } = props as PositionComboboxPropsSingle;
  return (
    <Combobox
      options={options}
      value={singleValue}
      onValueChange={(_, option) =>
        singleOnChange(
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
