import type { ReactNode } from "react";
import { MultipleCombobox } from "@/components/ui/multiple-combobox";
import { cn } from "@/utils/style";

type IdLabelOption = { value: string; label: string };

type IdLabelMultipleComboboxProps = {
	options: IdLabelOption[];
	value: string[];
	onValueChange: (values: string[]) => void;
	onSearchChange: (query: string) => void;
	placeholder?: ReactNode;
	searchPlaceholder?: string;
	emptyMessage?: ReactNode;
	className?: string;
};

function buttonChildren(placeholder: ReactNode) {
	return (_values: string[], selectedOptions: { value: string; label: ReactNode }[]) => (
		<span className="truncate">
			{selectedOptions.length > 0 ? selectedOptions.map((o) => o.label).join(", ") : placeholder}
		</span>
	);
}

export function IdLabelMultipleCombobox({
	options,
	value,
	onValueChange,
	onSearchChange,
	placeholder,
	searchPlaceholder,
	emptyMessage,
	className,
}: IdLabelMultipleComboboxProps) {
	return (
		<MultipleCombobox
			options={options}
			value={value}
			onValueChange={(values) => onValueChange(values)}
			onSearchChange={onSearchChange}
			placeholder={placeholder}
			searchPlaceholder={searchPlaceholder}
			emptyMessage={emptyMessage}
			className={cn("w-full", className)}
			buttonProps={{
				className: "h-9 w-full justify-between font-normal",
				children: buttonChildren(placeholder),
			}}
		/>
	);
}
