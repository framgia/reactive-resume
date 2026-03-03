import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";
import { useIdLabelOptions } from "@/hooks/use-id-label-options";
import { IdLabelMultipleCombobox } from "@/components/ui/id-label-multiple-combobox";
import { Label } from "@/components/ui/label";
import { orpc } from "@/integrations/orpc/client";

const SKILL_LIST_LIMIT = 20;

type SkillComboboxProps = {
	value: string[];
	onChange: (value: string[]) => void;
	appliedIds?: string[];
	getLabelRef?: MutableRefObject<((id: string) => string) | undefined>;
	label?: React.ReactNode;
	placeholder?: React.ReactNode;
};

export function SkillCombobox({
	value,
	onChange,
	appliedIds = [],
	getLabelRef,
	label = <Trans>Skills</Trans>,
	placeholder = t`All skills`,
}: SkillComboboxProps) {
	const [debouncedSearch, setSearchInput] = useDebounceValue("", 300);
	const { data: skills = [] } = useQuery(
		orpc.skill.list.queryOptions({
			input: { query: debouncedSearch.trim() || undefined, limit: SKILL_LIST_LIMIT },
		}),
	);
	const { options, getLabel } = useIdLabelOptions(skills, appliedIds, value);

	useEffect(() => {
		if (getLabelRef) getLabelRef.current = getLabel;
	}, [getLabel, getLabelRef]);

	return (
		<div className="space-y-2">
			<Label>{label}</Label>
			<IdLabelMultipleCombobox
				options={options}
				value={value}
				onValueChange={onChange}
				onSearchChange={setSearchInput}
				placeholder={placeholder}
				searchPlaceholder={t`Search skills...`}
				emptyMessage={t`No skills found.`}
			/>
		</div>
	);
}
