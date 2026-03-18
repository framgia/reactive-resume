import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useDebounceValue } from "usehooks-ts";
import { Combobox } from "@/components/ui/combobox";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

type CustomerComboboxProps = {
	value: string | null;
	onChange: (value: string | null, label?: string) => void;
	disabled?: boolean;
};

export function CustomerCombobox({ value, onChange, disabled }: CustomerComboboxProps) {
	const [debouncedSearch, setSearchInput] = useDebounceValue("", 300);

	const { data } = useQuery(
		orpc.customer.list.queryOptions({
			input: { query: debouncedSearch.trim() || undefined, limit: 20 },
		}),
	);

	const customers = useMemo(
		() => (data as { items?: { id: string; name: string }[] } | undefined)?.items ?? [],
		[data],
	);

	const options = useMemo(
		() => customers.map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })),
		[customers],
	);

	return (
		<Combobox
			options={options}
			value={value}
			onValueChange={(_, option) =>
				onChange(
					(option?.value as string | null | undefined) ?? null,
					option?.label != null ? String(option.label) : undefined,
				)
			}
			onSearchChange={setSearchInput}
			placeholder={t`Select customer`}
			searchPlaceholder={t`Search customers...`}
			emptyMessage={t`No customers found.`}
			className={cn("w-full")}
			disabled={disabled}
			clearable
		/>
	);
}

