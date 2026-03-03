import { t } from "@lingui/core/macro";
import { useQuery } from "@tanstack/react-query";
import type { MutableRefObject } from "react";
import { useEffect } from "react";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { orpc } from "@/integrations/orpc/client";

const POSITION_LIST_LIMIT = 50;

type PositionSelectProps = {
	value: string | null;
	onChange: (value: string | null) => void;
	placeholder?: React.ReactNode;
	label?: React.ReactNode;
	disabled?: boolean;
	className?: string;
	getLabelRef?: MutableRefObject<((id: string) => string) | undefined>;
};

export function PositionSelect({
	value,
	onChange,
	placeholder = t`Any level`,
	label,
	disabled = false,
	className,
	getLabelRef,
}: PositionSelectProps) {
	const { data: positions = [] } = useQuery(
		orpc.position.list.queryOptions({ input: { limit: POSITION_LIST_LIMIT } }),
	);

	const options = positions.map((p) => ({ value: p.id, label: p.name }));
	const getLabel = (id: string) => options.find((o) => o.value === id)?.label ?? id;
	useEffect(() => {
		if (getLabelRef) getLabelRef.current = getLabel;
	}, [getLabelRef, getLabel, options]);

	return (
		<div className={className ? `space-y-2 ${className}` : "space-y-2"}>
			{label !== undefined && (
				<Label className="font-medium text-muted-foreground text-xs">{label}</Label>
			)}
			<Combobox
				options={options}
				value={value}
				onValueChange={(_, option) => onChange(option?.value ?? null)}
				placeholder={placeholder}
				searchPlaceholder={t`Search positions...`}
				emptyMessage={t`No positions found.`}
				disabled={disabled}
				clearable
				buttonProps={{
					variant: "outline",
					className: "w-full justify-start",
					children: (_, option) => (option ? option.label : placeholder),
				}}
			/>
		</div>
	);
}
