import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, ReadCvLogoIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";

type Props = Omit<React.ComponentProps<typeof DropdownMenuContent>, "children"> & {
	project: RouterOutput["project"]["list"]["items"][number];
	children: React.ReactNode;
};

export function ProjectDropdownMenu({ project, children, ...props }: Props) {
	const confirm = useConfirm();
	const { openDialog } = useDialogStore();
	const navigate = useNavigate();

	const { mutate: deleteProject } = useMutation(orpc.project.delete.mutationOptions());

	const handleViewResumes = () => {
		navigate({ to: "/dashboard/resumes", search: { projectId: project.id } });
	};

	const handleUpdate = () => {
		openDialog("project.update", {
			id: project.id,
			name: project.name,
			description: project.description,
			customerName: project.customerName,
		});
	};

	const handleDelete = async () => {
		const confirmation = await confirm(t`Are you sure you want to delete this project?`, {
			description: t`This action cannot be undone.`,
		});

		if (!confirmation) return;

		const toastId = toast.loading(t`Deleting project...`);

		deleteProject(
			{ id: project.id },
			{
				onSuccess: () => {
					toast.success(t`Project deleted successfully.`, { id: toastId });
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

			<DropdownMenuContent {...props}>
				<DropdownMenuItem onSelect={handleViewResumes}>
					<ReadCvLogoIcon />
					<Trans>View Resumes</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem onSelect={handleUpdate}>
					<PencilSimpleLineIcon />
					<Trans>Edit</Trans>
				</DropdownMenuItem>

				<DropdownMenuItem variant="destructive" onSelect={handleDelete}>
					<TrashSimpleIcon />
					<Trans>Delete</Trans>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
