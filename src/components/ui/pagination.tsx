import { CaretLeftIcon, CaretRightIcon, DotsThreeIcon } from "@phosphor-icons/react";
import * as React from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { getPaginationRange } from "@/utils/pagination";
import { cn } from "@/utils/style";
import { PAGE_SIZE_OPTIONS } from "@/constants";

function Pagination({ className, ...props }: React.ComponentProps<"nav">) {
	return (
		<nav
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			className={cn("mx-auto flex w-full justify-center", className)}
			{...props}
		/>
	);
}

function PaginationContent({ className, ...props }: React.ComponentProps<"ul">) {
	return <ul data-slot="pagination-content" className={cn("flex items-center gap-1", className)} {...props} />;
}

function PaginationItem({ ...props }: React.ComponentProps<"li">) {
	return <li data-slot="pagination-item" {...props} />;
}

type PaginationLinkProps = {
	isActive?: boolean;
} & Pick<React.ComponentProps<typeof Button>, "size"> &
	React.ComponentProps<"a">;

function PaginationLink({ className, isActive, size = "icon", ...props }: PaginationLinkProps) {
	return (
		<Button asChild variant={isActive ? "outline" : "ghost"} size={size} className={cn(className)}>
			<a aria-current={isActive ? "page" : undefined} data-slot="pagination-link" data-active={isActive} {...props} />
		</Button>
	);
}

function PaginationPrevious({
	className,
	text = "Previous",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink aria-label="Go to previous page" size="default" className={cn("pl-2!", className)} {...props}>
			<CaretLeftIcon data-icon="inline-start" />
			<span className="hidden sm:block">{text}</span>
		</PaginationLink>
	);
}

function PaginationNext({
	className,
	text = "Next",
	...props
}: React.ComponentProps<typeof PaginationLink> & { text?: string }) {
	return (
		<PaginationLink aria-label="Go to next page" size="default" className={cn("pr-2!", className)} {...props}>
			<span className="hidden sm:block">{text}</span>
			<CaretRightIcon data-icon="inline-end" />
		</PaginationLink>
	);
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<"span">) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn("flex size-9 items-center justify-center [&_svg:not([class*='size-'])]:size-4", className)}
			{...props}
		>
			<DotsThreeIcon />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export type PaginationBarProps = {
	page: number;
	totalPage: number;
	pageSize: number;
	onPageSizeChange: (size: number) => void;
	getPageHref: (pageNum: number) => string;
	/** When provided, used for prev/next disabled state (e.g. from TanStack Table). */
	canPreviousPage?: boolean;
	canNextPage?: boolean;
	/** When provided, called when user selects a page (prev/next or number). Enables client-side pagination without URL update. */
	onPageSelect?: (pageNum: number) => void;
	perPageLabel?: React.ReactNode;
	className?: string;
};

function PaginationBar({
	page,
	totalPage,
	pageSize,
	onPageSizeChange,
	getPageHref,
	canPreviousPage,
	canNextPage,
	onPageSelect,
	className,
}: PaginationBarProps) {
	const pageSizeOptions = React.useMemo(
		() => PAGE_SIZE_OPTIONS.map((n) => ({ value: n, label: String(n) })),
		[],
	);
	const range = getPaginationRange(page, totalPage);
	const canPrev = canPreviousPage ?? page > 1;
	const canNext = canNextPage ?? page < totalPage;
	const prevHref = canPrev ? getPageHref(page - 1) : undefined;
	const nextHref = canNext ? getPageHref(page + 1) : undefined;

	return (
		<div className={cn("flex flex-wrap items-center justify-end gap-4", className)}>
			<Pagination className="mx-0 w-auto">
				<PaginationContent>
					<PaginationItem>
						<PaginationPrevious
							href={prevHref ?? "#"}
							aria-disabled={!canPrev}
							className={!canPrev ? "pointer-events-none opacity-50" : undefined}
							onClick={(e) => {
								if (!canPrev) e.preventDefault();
								else if (onPageSelect) {
									e.preventDefault();
									onPageSelect(page - 1);
								}
							}}
						/>
					</PaginationItem>
					{range.map((item, idx) =>
						item === "ellipsis" ? (
							<PaginationItem key={`ellipsis-${idx}`}>
								<PaginationEllipsis />
							</PaginationItem>
						) : (
							<PaginationItem key={item}>
								<a
									href={getPageHref(item)}
									aria-current={page === item ? "page" : undefined}
									className={cn(
										buttonVariants({ variant: page === item ? "outline" : "ghost", size: "icon" }),
										"size-9 min-w-9",
									)}
									onClick={(e) => {
										if (onPageSelect && page !== item) {
											e.preventDefault();
											onPageSelect(item);
										}
									}}
								>
									{item}
								</a>
							</PaginationItem>
						),
					)}
					<PaginationItem>
						<PaginationNext
							href={nextHref ?? "#"}
							aria-disabled={!canNext}
							className={!canNext ? "pointer-events-none opacity-50" : undefined}
							onClick={(e) => {
								if (!canNext) e.preventDefault();
								else if (onPageSelect) {
									e.preventDefault();
									onPageSelect(page + 1);
								}
							}}
						/>
					</PaginationItem>
				</PaginationContent>
			</Pagination>
			<Combobox<number>
				clearable={false}
				value={pageSize}
				options={pageSizeOptions}
				onValueChange={(value) => {
					if (value != null) {
						const size = Number(value);
						if (!Number.isNaN(size)) onPageSizeChange(size);
					}
				}}
				buttonProps={{
					title: "Rows per page",
					variant: "ghost",
					children: (_, option) => (
						<>
							{option?.label ?? pageSize} Rows per page
						</>
					),
				}}
			/>
		</div>
	);
}

export {
	Pagination,
	PaginationBar,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};
