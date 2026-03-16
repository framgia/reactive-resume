import { CometCard } from "@/components/animation/comet-card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/style";

type BaseCardProps = React.ComponentProps<"div"> & {
	title: string;
	description: string;
	projectName?: string | null;
	positionName?: string | null;
	tags?: string[];
	className?: string;
	children?: React.ReactNode;
};

export function BaseCard({
	title,
	description,
	projectName,
	positionName,
	tags,
	className,
	children,
	...props
}: BaseCardProps) {
	return (
		<CometCard translateDepth={3} rotateDepth={6}>
			<div
				{...props}
				className={cn(
					"relative flex aspect-page size-full overflow-hidden rounded-md bg-popover shadow transition-shadow hover:shadow-xl",
					className,
				)}
			>
				{children}

				<div className="absolute inset-x-0 bottom-0 flex w-full flex-col justify-end space-y-1 bg-background/40 px-4 py-3 backdrop-blur-xs">
					<h3 className="truncate font-medium tracking-tight">{title}</h3>

					{(projectName || positionName) && (
						<div className="flex flex-wrap items-center gap-1">
							{projectName && <Badge variant="default">{projectName}</Badge>}
							{positionName && <Badge variant="secondary">{positionName}</Badge>}
						</div>
					)}

					<p className="truncate text-xs opacity-80">{description}</p>

					<div className={cn("mt-2 hidden flex-wrap items-center gap-1", tags && tags.length > 0 && "flex")}>
						{tags?.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
					</div>
				</div>
			</div>
		</CometCard>
	);
}
