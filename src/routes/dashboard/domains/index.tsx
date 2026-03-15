import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DotsThreeIcon, GlobeIcon, PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
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
import { DEFAULT_PAGE_SIZE } from "@/constants";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/domains/")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);
	const confirm = useConfirm();

	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: DEFAULT_PAGE_SIZE,
	});

	const { data, isLoading } = useQuery<RouterOutput["domain"]["list"]>(
		orpc.domain.list.queryOptions({
			input: { page: pagination.pageIndex + 1, pageSize: pagination.pageSize },
		}),
	);

	const domains = (data?.items ?? []) as RouterOutput["domain"]["list"]["items"];
	const total = data?.total;

	type DomainRow = RouterOutput["domain"]["list"]["items"][number];

	const table = useReactTable({
		data: domains as DomainRow[],
		columns: useMemo<ColumnDef<DomainRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
		getCoreRowModel: getCoreRowModel(),
		manualPagination: true,
		rowCount: total,
		state: { pagination },
		onPaginationChange: (updater) => {
			setPagination((prev) => {
				const next = typeof updater === "function" ? updater(prev) : updater;
				return next.pageSize !== prev.pageSize ? { ...next, pageIndex: 0 } : next;
			});
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
				</div>

				{isLoading && !data ? (
					<div className="flex items-center justify-center gap-x-2 px-1 text-muted-foreground text-xs">
						<Spinner className="size-10" />
						<span>
							<Trans>Loading...</Trans>
						</span>
					</div>
				) : (
					<>
						<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
							<div className="px-1 font-medium text-muted-foreground text-xs">
								<Trans>Name</Trans>
							</div>
							<div className="w-12" />
							{domains.map((domain) => (
								<div key={domain.id} className="contents">
									<div className="flex h-12 items-center rounded-md px-1">
										<div className="flex min-w-0 flex-1 items-center">
											<span className="truncate font-medium">{domain.name}</span>
										</div>
									</div>
									<div className="flex h-12 items-center justify-end px-1">
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button size="icon" variant="ghost" className="size-12 shrink-0">
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
								</div>
							))}
						</div>

						<PaginationBar
							page={table.getState().pagination.pageIndex + 1}
							totalPage={table.getPageCount()}
							pageSize={table.getState().pagination.pageSize}
							onPageSizeChange={(size) => table.setPageSize(size)}
							getPageHref={() => "#"}
							canPreviousPage={table.getCanPreviousPage()}
							canNextPage={table.getCanNextPage()}
							onPageSelect={(pageNum) => table.setPageIndex(pageNum - 1)}
						/>
					</>
				)}
			</div>
		</div>
	);
}
