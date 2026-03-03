import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { DotsThreeIcon, GlobeIcon, PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Separator } from "@/components/ui/separator";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc } from "@/integrations/orpc/client";
import { DashboardHeader } from "../-components/header";

export const Route = createFileRoute("/dashboard/domains/")({
	component: RouteComponent,
});

function RouteComponent() {
	const queryClient = useQueryClient();
	const openDialog = useDialogStore((state) => state.openDialog);
	const confirm = useConfirm();

	const { data: domains = [] } = useQuery(orpc.domain.list.queryOptions({ input: {} }));

	const { mutate: deleteDomain, isPending: isDeleting } = useMutation(
		orpc.domain.delete.mutationOptions({
			onSuccess: () => {
				queryClient.invalidateQueries({ queryKey: orpc.domain.list.queryOptions({ input: {} }).queryKey });
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
				<Button
					variant="ghost"
					size="lg"
					className="h-12 w-full justify-start gap-x-4 text-start"
					onClick={() => openDialog("domain.create", undefined)}
				>
					<PlusIcon />
					<Trans>Create a new domain</Trans>
				</Button>

				<AnimatePresence>
					{domains.map((domain, index) => (
						<motion.div
							key={domain.id}
							initial={{ opacity: 0, y: -12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ delay: index * 0.03 }}
							className="flex h-12 items-center justify-between gap-x-2 rounded-md border bg-card px-3"
						>
							<span className="truncate font-medium">{domain.name}</span>
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
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}
