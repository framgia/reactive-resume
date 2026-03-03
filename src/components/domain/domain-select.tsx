import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { MultipleCombobox } from "@/components/ui/multiple-combobox";
import { orpc } from "@/integrations/orpc/client";

const SEARCH_DEBOUNCE_MS = 300;

type DomainSelectProps = {
	value: string[];
	onChange: (domainIds: string[]) => void;
	disabled?: boolean;
	placeholder?: React.ReactNode;
	className?: string;
};

export function DomainSelect({ value, onChange, disabled = false, placeholder = null, className }: DomainSelectProps) {
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounceValue(search, SEARCH_DEBOUNCE_MS);

	const { data: domains = [] } = useQuery(
		orpc.domain.list.queryOptions({ input: { query: debouncedSearch.trim() || undefined } }),
	);

	const options = domains.map((d) => ({
		value: d.id,
		label: d.name,
	}));

	return (
		<MultipleCombobox
			options={options}
			value={value}
			onValueChange={(ids) => onChange(ids)}
			onSearchChange={setSearch}
			placeholder={placeholder ?? <Trans>Select domains</Trans>}
			searchPlaceholder="Search domains..."
			emptyMessage={<Trans>No domains found.</Trans>}
			disableClear={false}
			buttonProps={{
				disabled,
				className: "w-full justify-between",
				children: (_values, selectedOptions) => (
					<>
						<span className="flex items-center gap-2 truncate">
							{selectedOptions.length > 0
								? selectedOptions.map((o) => o.label).join(", ")
								: (placeholder ?? <Trans>Select domains</Trans>)}
						</span>
					</>
				),
			}}
			className={className}
		/>
	);
}
