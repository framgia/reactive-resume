import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import { IdLabelMultipleCombobox } from "@/components/ui/id-label-multiple-combobox";
import { Label } from "@/components/ui/label";
import { useIdLabelOptions } from "@/hooks/use-id-label-options";
import { orpc } from "@/integrations/orpc/client";

const POSITION_LIST_LIMIT = 20;

type PositionComboboxProps = {
	value: string[];
	onChange: (value: string[]) => void;
	appliedIds?: string[];
	getLabelRef?: MutableRefObject<((id: string) => string) | undefined>;
};

export function PositionCombobox({ value, onChange, appliedIds = [], getLabelRef }: PositionComboboxProps) {
	const [debouncedSearch, setSearchInput] = useDebounceValue("", 300);
	const { data } = useQuery(
		orpc.position.list.queryOptions({
			input: { query: debouncedSearch.trim() || undefined, limit: POSITION_LIST_LIMIT },
		}),
	);
	const positions = data?.items ?? [];
	const { options, getLabel } = useIdLabelOptions(positions, appliedIds, value);

	useEffect(() => {
		if (getLabelRef) getLabelRef.current = getLabel;
	}, [getLabel, getLabelRef]);

	return (
		<div className="space-y-2">
			<Label>
				<Trans>Positions</Trans>
			</Label>
			<IdLabelMultipleCombobox
				options={options}
				value={value}
				onValueChange={onChange}
				onSearchChange={setSearchInput}
				placeholder={t`All positions`}
				searchPlaceholder={t`Search positions...`}
				emptyMessage={t`No positions found.`}
			/>
		</div>
	);
}
