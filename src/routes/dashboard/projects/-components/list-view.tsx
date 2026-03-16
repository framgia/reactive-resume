import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { ArrowCounterClockwiseIcon, DotsThreeIcon, PlusIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/dialogs/store";
import { orpc, type RouterOutput } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";
import { ProjectDropdownMenu } from "./menus/dropdown-menu";

type Project = RouterOutput["project"]["list"]["items"][number];

type Props = {
	projects: Project[];
};

export function ListView({ projects }: Props) {
	const { openDialog } = useDialogStore();

	const handleCreateProject = () => {
		openDialog("project.create", undefined);
	};

	return (
		<div className="flex flex-col gap-y-1">
			<motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}>
				<Button
					size="lg"
					variant="ghost"
					tapScale={0.99}
					className="h-12 w-full justify-start gap-x-4 text-start"
					onClick={handleCreateProject}
				>
					<PlusIcon />
					<div className="min-w-80 truncate">
						<Trans>Create a new project</Trans>
					</div>

					<p className="text-xs opacity-60">
						<Trans>Add name, description and customer</Trans>
					</p>
				</Button>
			</motion.div>

			<div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center gap-x-4 gap-y-1">
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Project</Trans>
				</div>
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Customer</Trans>
				</div>
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Domains</Trans>
				</div>
				<div className="min-w-32 px-1 font-medium text-muted-foreground text-xs">
					<Trans>Updated</Trans>
				</div>
				<div className="w-12" />

				<AnimatePresence>
					{projects?.map((project, index) => (
						<motion.div
							layout
							key={project.id}
							className="contents"
							initial={{ opacity: 0, y: -50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, x: -50, filter: "blur(12px)" }}
							transition={{ delay: (index + 1) * 0.05 }}
						>
							<ProjectListItem project={project} />
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}

function ProjectListItem({ project }: { project: Project }) {
	const { i18n } = useLingui();
	const isDeleted = project.deletedAt != null;

	const updatedAt = useMemo(() => {
		return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(project.updatedAt);
	}, [i18n.locale, project.updatedAt]);

	const deletedAt = useMemo(() => {
		if (!project.deletedAt) return null;
		return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(project.deletedAt);
	}, [i18n.locale, project.deletedAt]);

	return (
		<>
			<div className={cn("flex h-12 items-center rounded-md px-1", isDeleted && "bg-muted/50 opacity-75")}>
				<div className="flex min-w-0 flex-1 items-center gap-x-2">
					<span className={cn("truncate", isDeleted && "text-muted-foreground line-through")}>{project.name}</span>
					{isDeleted && (
						<Badge variant="secondary" className="shrink-0">
							<Trans>Deleted</Trans>
						</Badge>
					)}
				</div>
			</div>

			<div className="flex h-12 min-w-0 items-center truncate px-1 text-muted-foreground text-sm">
				{project.customerName ?? "—"}
			</div>

			<div className="flex h-12 min-w-0 items-center truncate px-1 text-muted-foreground text-sm">
				{project.domainNames || "—"}
			</div>

			<p className="flex h-12 min-w-32 shrink-0 items-center px-1 text-xs opacity-60">
				{isDeleted ? <Trans>Deleted on {deletedAt}</Trans> : <Trans>Last updated on {updatedAt}</Trans>}
			</p>

			{isDeleted ? (
				<ProjectRestoreButton project={project} />
			) : (
				<ProjectDropdownMenu project={project} align="end">
					<Button size="icon" variant="ghost" className="size-12">
						<DotsThreeIcon />
					</Button>
				</ProjectDropdownMenu>
			)}
		</>
	);
}

function ProjectRestoreButton({ project }: { project: Project }) {
	const { mutate: restoreProject, isPending } = useMutation(orpc.project.restore.mutationOptions());

	const handleRestore = () => {
		const toastId = toast.loading(t`Restoring project...`);
		(
			restoreProject as unknown as (
				input: { id: string },
				options?: { onSuccess?: () => void; onError?: (error: Error) => void },
			) => void
		)(
			{ id: project.id },
			{
				onSuccess: () => {
					toast.success(t`Project restored.`, { id: toastId });
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	return (
		<Button
			size="sm"
			variant="secondary"
			className="size-12 shrink-0"
			disabled={isPending}
			onClick={handleRestore}
			title={t`Restore project`}
		>
			<ArrowCounterClockwiseIcon />
		</Button>
	);
}
