import { cn } from "@/utils/style";

type Props = React.ComponentProps<"img"> & {
	variant?: "logo" | "icon";
};

export function BrandIcon({ variant = "logo", className, ...props }: Props) {
	return (
		<img
			src={`/${variant}/sun.png`}
			alt="Reactive Resume"
			className={cn("hidden size-12 dark:block", className)}
			{...props}
		/>
	);
}
