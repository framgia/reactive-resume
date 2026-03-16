import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { DotsThreeIcon, DownloadSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/dialogs/store";
import type { RouterOutput } from "@/integrations/orpc/client";
import { ResumeDropdownMenu } from "./menus/dropdown-menu";

type Resume = RouterOutput["resume"]["list"][number];

type Props = {
	resumes: Resume[];
};

export function ListView({ resumes }: Props) {
	const { openDialog } = useDialogStore();

	const handleCreateResume = () => {
		openDialog("resume.create", undefined);
	};

	const handleImportResume = () => {
		openDialog("resume.import", undefined);
	};

	return (
		<div className="flex flex-col gap-y-1">
			<motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }}>
				<Button
					size="lg"
					variant="ghost"
					tapScale={0.99}
					className="h-12 w-full justify-start gap-x-4 text-start"
					onClick={handleCreateResume}
				>
					<PlusIcon />
					<div className="min-w-80 truncate">
						<Trans>Create a new resume</Trans>
					</div>

					<p className="text-xs opacity-60">
						<Trans>Start building your resume from scratch</Trans>
					</p>
				</Button>
			</motion.div>

			<motion.div
				initial={{ opacity: 0, y: -50 }}
				animate={{ opacity: 1, y: 0 }}
				exit={{ opacity: 0, y: -50 }}
				transition={{ delay: 0.05 }}
			>
				<Button
					size="lg"
					variant="ghost"
					tapScale={0.99}
					className="h-12 w-full justify-start gap-x-4 text-start"
					onClick={handleImportResume}
				>
					<DownloadSimpleIcon />

					<div className="min-w-80 truncate">
						<Trans>Import an existing resume</Trans>
					</div>

					<p className="text-xs opacity-60">
						<Trans>Continue where you left off</Trans>
					</p>
				</Button>
			</motion.div>

			<div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_minmax(0,1.5fr)_auto] items-center gap-x-2 gap-y-1 px-1">
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Resume</Trans>
				</div>
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Project</Trans>
				</div>
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Position</Trans>
				</div>
				<div className="px-1 font-medium text-muted-foreground text-xs">
					<Trans>Updated</Trans>
				</div>
				<div className="w-10" />

				<AnimatePresence>
					{resumes?.map((resume, index) => (
						<motion.div
							key={resume.id}
							layout
							initial={{ opacity: 0, y: -50 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, x: -50, filter: "blur(12px)" }}
							transition={{ delay: (index + 1) * 0.05 }}
							className="contents"
						>
							<ResumeListItem resume={resume} />
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
}

function ResumeListItem({ resume }: { resume: Resume }) {
	const { i18n } = useLingui();

	const updatedAt = useMemo(() => {
		return Intl.DateTimeFormat(i18n.locale, { dateStyle: "long", timeStyle: "short" }).format(resume.updatedAt);
	}, [i18n.locale, resume.updatedAt]);

	return (
		<>
			<div className="flex items-center">
				<Button
					asChild
					size="lg"
					variant="ghost"
					tapScale={0.99}
					className="h-12 w-full justify-start gap-x-4 text-start"
				>
					<Link to="/builder/$resumeId" params={{ resumeId: resume.id }}>
						<div className="size-3" />
						<div className="truncate">{resume.name}</div>
					</Link>
				</Button>
			</div>

			<div className="flex h-12 items-center px-1 text-muted-foreground text-xs">
				{resume.projectName ?? "—"}
			</div>

			<div className="flex h-12 items-center px-1 text-muted-foreground text-xs">
				{resume.position ?? "—"}
			</div>

			<div className="flex h-12 items-center px-1 text-muted-foreground text-xs">
				<Trans>Last updated on {updatedAt}</Trans>
			</div>

			<div className="flex h-12 items-center justify-end">
				<ResumeDropdownMenu resume={resume} align="end">
					<Button size="icon" variant="ghost" className="size-10">
						<DotsThreeIcon />
					</Button>
				</ResumeDropdownMenu>
			</div>
		</>
	);
}
