import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useEffect, useMemo } from "react";
import { useDebounceValue } from "usehooks-ts";
import { IdLabelMultipleCombobox } from "@/components/ui/id-label-multiple-combobox";
import { Label } from "@/components/ui/label";
import { useIdLabelOptions } from "@/hooks/use-id-label-options";
import { orpc } from "@/integrations/orpc/client";

type DomainComboboxProps = {
	value: string[];
	onChange: (value: string[]) => void;
	appliedIds?: string[];
	getLabelRef?: MutableRefObject<((id: string) => string) | undefined>;
};

export function DomainCombobox({ value, onChange, appliedIds = [], getLabelRef }: DomainComboboxProps) {
	const [debouncedSearch, setSearchInput] = useDebounceValue("", 300);
	const { data } = useQuery(orpc.domain.list.queryOptions({ input: { query: debouncedSearch.trim() || undefined } }));
	const domains = data?.items ?? [];
	const domainItems = useMemo(() => domains.map((d) => ({ id: d.id, name: d.name })), [domains]);
	const { options, getLabel } = useIdLabelOptions(domainItems, appliedIds, value);

	useEffect(() => {
		if (getLabelRef) getLabelRef.current = getLabel;
	}, [getLabel, getLabelRef]);

	return (
		<div className="space-y-2">
			<Label>
				<Trans>Domains</Trans>
			</Label>
			<IdLabelMultipleCombobox
				options={options}
				value={value}
				onValueChange={onChange}
				onSearchChange={setSearchInput}
				placeholder={t`All domains`}
				searchPlaceholder={t`Search domains...`}
				emptyMessage={t`No domains found.`}
			/>
		</div>
	);
}
