import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DotsThreeIcon, GlobeIcon, PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginationBar } from "@/components/ui/pagination";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/domains/")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);
	const confirm = useConfirm();

	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

	const { data, isLoading, isFetching } = useQuery<RouterOutput["domain"]["list"]>(
		orpc.domain.list.queryOptions({ input: { page, pageSize } }),
	);

	const domains = (data?.items ?? []) as RouterOutput["domain"]["list"]["items"];
	const total = data?.total ?? domains.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));

	type DomainRow = RouterOutput["domain"]["list"]["items"][number];

	const paginationTable = useReactTable({
		data: domains as DomainRow[],
		columns: useMemo<ColumnDef<DomainRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		pageCount: totalPages,
		state: {
			pagination: { pageIndex: page - 1, pageSize },
		},
		onPaginationChange: (updaterOrValue) => {
			const prev = { pageIndex: page - 1, pageSize };
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(prev)
					: (updaterOrValue as typeof prev);
			const nextPage = next.pageSize !== pageSize ? 1 : next.pageIndex + 1;
			setPage(nextPage);
			setPageSize(next.pageSize);
		},
	});

	const { mutate: deleteDomain, isPending: isDeleting } = useMutation<void, Error, { id: string }>(
		orpc.domain.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.domain.list.queryOptions({ input: {} }).queryKey,
				});
			},
		}),
	);

	const handleDelete = (id: string, name: string) => {
		confirm(t`Are you sure you want to delete "${name}"?`, {
			description: t`This will remove the domain from all projects.`,
			confirmText: t`Delete`,
			cancelText: t`Cancel`,
		}).then((ok) => {
			if (!ok) return;
			const toastId = toast.loading(t`Deleting domain...`);
			deleteDomain(
				{ id },
				{
					onSuccess: () => toast.success(t`Domain deleted.`, { id: toastId }),
					onError: (e) => toast.error(e.message, { id: toastId }),
				},
			);
		});
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={GlobeIcon} title={t`Domains`} />

			<Separator />

			<div className="flex flex-col gap-y-2">
				<div className="flex items-center gap-x-2">
					<Button
						variant="ghost"
						size="lg"
						className="h-12 flex-1 justify-start gap-x-4 text-start"
						onClick={() => openDialog("domain.create", undefined)}
					>
						<PlusIcon />
						<Trans>Create a new domain</Trans>
					</Button>
					{(isLoading || isFetching) && (
						<div className="flex items-center gap-x-2 px-1 text-muted-foreground text-xs">
							<Spinner className="size-4" />
							<span>
								<Trans>Loading...</Trans>
							</span>
						</div>
					)}
				</div>

				<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
					<div className="px-1 font-medium text-muted-foreground text-xs">
						<Trans>Name</Trans>
					</div>
					<div className="w-12" />

					<AnimatePresence>
						{domains.map((domain, index) => (
							<motion.div
								key={domain.id}
								className="contents"
								initial={{ opacity: 0, y: -12 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, x: -20 }}
								transition={{ delay: index * 0.03 }}
							>
								<div className="flex h-12 items-center rounded-md px-1">
									<span className="truncate font-medium">{domain.name}</span>
								</div>
								<div className="flex h-12 items-center justify-end px-1">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button size="icon" variant="ghost" className="size-8 shrink-0">
												<DotsThreeIcon />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem
												onClick={() =>
													openDialog("domain.update", {
														id: domain.id,
														name: domain.name,
													})
												}
											>
												<PencilSimpleLineIcon />
												<Trans>Edit</Trans>
											</DropdownMenuItem>
											<DropdownMenuItem
												className="text-destructive focus:text-destructive"
												onClick={() => handleDelete(domain.id, domain.name)}
												disabled={isDeleting}
											>
												<TrashSimpleIcon />
												<Trans>Delete</Trans>
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</motion.div>
						))}
					</AnimatePresence>
				</div>

				<PaginationBar
					page={page}
					totalPages={totalPages}
					pageSize={pageSize}
					onPageSizeChange={(size) => paginationTable.setPageSize(size)}
					getPageHref={() => "#"}
					canPreviousPage={paginationTable.getCanPreviousPage()}
					canNextPage={paginationTable.getCanNextPage()}
					onPageSelect={(pageNum) => paginationTable.setPageIndex(pageNum - 1)}
				/>
			</div>
		</div>
	);
}
