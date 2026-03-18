import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
	ArrowCounterClockwiseIcon,
	DotsThreeIcon,
	PencilSimpleLineIcon,
	PlusIcon,
	SortAscendingIcon,
	TrashSimpleIcon,
	UsersThreeIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
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

export const Route = createFileRoute("/dashboard/customers/")({
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

	const [sort, setSort] = useState<"lastUpdatedAt" | "name">("lastUpdatedAt");

	const sortOptions: Array<{ value: "lastUpdatedAt" | "name"; label: React.ReactNode }> = [
		{ value: "lastUpdatedAt", label: <Trans>Latest update</Trans> },
		{ value: "name", label: <Trans>Name</Trans> },
	];

	const { data, isLoading } = useQuery<RouterOutput["customer"]["list"]>(
		orpc.customer.list.queryOptions({
			input: { page: pagination.pageIndex + 1, pageSize: pagination.pageSize, sort },
		}),
	);

	const customers = (data?.items ?? []) as RouterOutput["customer"]["list"]["items"];
	const total = data?.total;

	type CustomerRow = RouterOutput["customer"]["list"]["items"][number];

	const table = useReactTable({
		data: customers as CustomerRow[],
		columns: useMemo<ColumnDef<CustomerRow>[]>(() => [{ id: "id", accessorKey: "id" }], []),
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

	const { mutate: deleteCustomer, isPending: isDeleting } = useMutation<void, Error, { id: string }>(
		orpc.customer.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.customer.list.queryOptions({ input: {} }).queryKey,
				});
			},
		}),
	);

	const { mutate: restoreCustomer, isPending: isRestoring } = useMutation<void, Error, { id: string }>(
		orpc.customer.restore.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({
					queryKey: orpc.customer.list.queryOptions({ input: {} }).queryKey,
				});
			},
		}),
	);

	const handleDelete = (id: string, name: string) => {
		confirm(t`Are you sure you want to delete "${name}"?`, {
			description: t`This will unlink the customer from related records.`,
			confirmText: t`Delete`,
			cancelText: t`Cancel`,
		}).then((ok) => {
			if (!ok) return;
			const toastId = toast.loading(t`Deleting customer...`);
			deleteCustomer(
				{ id },
				{
					onSuccess: () => toast.success(t`Customer deleted.`, { id: toastId }),
					onError: (e) => toast.error(e.message, { id: toastId }),
				},
			);
		});
	};

	const handleRestore = (id: string) => {
		const toastId = toast.loading(t`Restoring customer...`);
		restoreCustomer(
			{ id },
			{
				onSuccess: () => toast.success(t`Customer restored.`, { id: toastId }),
				onError: (e) => toast.error(e.message, { id: toastId }),
			},
		);
	};

	return (
		<div className="space-y-4">
			<DashboardHeader icon={UsersThreeIcon} title={t`Customers`} />

			<Separator />

			<div className="flex flex-col gap-y-2">
				<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
					<Button
						variant="ghost"
						size="lg"
						className="justify-start gap-x-4 text-start"
						onClick={() => openDialog("customer.create", undefined)}
					>
						<PlusIcon />
						<Trans>Create a new customer</Trans>
					</Button>
					<Combobox
						value={sort}
						options={sortOptions}
						onValueChange={(value) => {
							if (!value) return;
							const next = value as "lastUpdatedAt" | "name";
							setSort(next);
							setPagination((prev) => ({ ...prev, pageIndex: 0 }));
						}}
						buttonProps={{
							title: t`Sort by`,
							variant: "ghost",
							children: (_, option) => (
								<>
									<SortAscendingIcon />
									{option?.label}
								</>
							),
						}}
					/>
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
							{customers.map((customer) => (
								<div key={customer.id} className="contents">
									<div className="flex h-12 items-center rounded-md px-1">
										<div className="flex min-w-0 flex-1 items-center">
											<span
												className={[
													"truncate font-medium",
													customer.deletedAt ? "text-muted-foreground line-through" : "",
												]
													.filter(Boolean)
													.join(" ")}
											>
												{customer.name}
											</span>
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
														openDialog("customer.update", {
															id: customer.id,
															name: customer.name,
														})
													}
													disabled={Boolean(customer.deletedAt)}
												>
													<PencilSimpleLineIcon />
													<Trans>Edit</Trans>
												</DropdownMenuItem>
												{customer.deletedAt ? (
													<DropdownMenuItem onClick={() => handleRestore(customer.id)} disabled={isRestoring}>
														<ArrowCounterClockwiseIcon />
														<Trans>Restore</Trans>
													</DropdownMenuItem>
												) : (
													<DropdownMenuItem
														className="text-destructive focus:text-destructive"
														onClick={() => handleDelete(customer.id, customer.name)}
														disabled={isDeleting}
													>
														<TrashSimpleIcon />
														<Trans>Delete</Trans>
													</DropdownMenuItem>
												)}
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
