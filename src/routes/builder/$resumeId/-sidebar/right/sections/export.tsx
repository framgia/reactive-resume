import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CircleNotchIcon, FileJsIcon, FilePdfIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { downloadFromUrl, downloadWithAnchor, generateFilename } from "@/utils/file";
import { SectionBase } from "../shared/section-base";

export function ExportSectionBuilder() {
	const resume = useResumeStore((state) => state.resume);

	const { mutateAsync: printResumeAsPDF, isPending: isPrinting } = useMutation(
		orpc.printer.printResumeAsPDF.mutationOptions(),
	);
	const { mutateAsync: uploadResumePDFToGoogleDrive, isPending: isUploadingToGoogleDrive } = useMutation(
		orpc.printer.uploadResumePDFToGoogleDrive.mutationOptions(),
	);
	const { data: authAccounts = [] } = useQuery({
		queryKey: ["auth", "accounts"],
		queryFn: () => authClient.listAccounts(),
		select: ({ data }) => data ?? [],
	});
	const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
	const [driveFileName, setDriveFileName] = useState(`${resume.data.basics.name || resume.name}.pdf`);
	const [driveFolderPath, setDriveFolderPath] = useState("");
	const isGoogleConnected = authAccounts.some((account) => account.providerId === "google");

	const onDownloadJSON = useCallback(() => {
		const filename = generateFilename(resume.data.basics.name, "json");
		const jsonString = JSON.stringify(resume.data, null, 2);
		const blob = new Blob([jsonString], { type: "application/json" });

		downloadWithAnchor(blob, filename);
	}, [resume]);

	const onDownloadPDF = useCallback(async () => {
		const filename = generateFilename(resume.data.basics.name, "pdf");
		const toastId = toast.loading(t`Please wait while your PDF is being generated...`, {
			description: t`This may take a while depending on the server capacity. Please do not close the window or refresh the page.`,
		});

		try {
			const { url } = (await printResumeAsPDF({
				id: resume.id,
			} as unknown as Parameters<typeof printResumeAsPDF>[0])) as { url: string };
			downloadFromUrl(url, filename);
		} catch {
			toast.error(t`There was a problem while generating the PDF, please try again in some time.`);
		} finally {
			toast.dismiss(toastId);
		}
	}, [resume, printResumeAsPDF]);

	const onOpenUploadDialog = useCallback(() => {
		if (!isGoogleConnected) return;
		setDriveFileName(`${resume.data.basics.name || resume.name}.pdf`);
		setDriveFolderPath("");
		setIsUploadDialogOpen(true);
	}, [resume.data.basics.name, resume.name, isGoogleConnected]);

	const onUploadToGoogleDrive = useCallback(async () => {
		const fileName = driveFileName.trim();
		if (!fileName) {
			toast.error(t`File name cannot be empty.`);
			return;
		}

		const toastId = toast.loading(t`Uploading PDF to Google Drive...`);

		try {
			const result = (await uploadResumePDFToGoogleDrive({
				id: resume.id,
				fileName,
				folderPath: driveFolderPath.trim() || undefined,
			} as unknown as Parameters<typeof uploadResumePDFToGoogleDrive>[0])) as { webViewLink: string | null };

			toast.success(t`PDF uploaded to Google Drive successfully.`, { id: toastId });
			setIsUploadDialogOpen(false);

			if (result.webViewLink) window.open(result.webViewLink, "_blank", "noopener,noreferrer");
		} catch {
			toast.error(t`Failed to upload PDF to Google Drive. Please connect Google account and try again.`, { id: toastId });
		}
	}, [driveFileName, driveFolderPath, resume.id, uploadResumePDFToGoogleDrive]);

	return (
		<SectionBase type="export" className="space-y-4">
			<Button
				variant="outline"
				onClick={onDownloadJSON}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				<FileJsIcon className="size-6 shrink-0" />
				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">JSON</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						<Trans>
							Download a copy of your resume in JSON format. Use this file for backup or to import your resume into
							other applications, including AI assistants.
						</Trans>
					</p>
				</div>
			</Button>

			<Button
				variant="outline"
				disabled={isPrinting}
				onClick={onDownloadPDF}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				{isPrinting ? (
					<CircleNotchIcon className="size-6 shrink-0 animate-spin" />
				) : (
					<FilePdfIcon className="size-6 shrink-0" />
				)}

				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">PDF</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						<Trans>
							Download a copy of your resume in PDF format. Use this file for printing or to easily share your resume
							with recruiters.
						</Trans>
					</p>
				</div>
			</Button>

			<Button
				variant="outline"
				disabled={isUploadingToGoogleDrive || !isGoogleConnected}
				onClick={onOpenUploadDialog}
				className="h-auto gap-x-4 whitespace-normal p-4! text-start font-normal active:scale-98"
			>
				{isUploadingToGoogleDrive ? (
					<CircleNotchIcon className="size-6 shrink-0 animate-spin" />
				) : (
					<UploadSimpleIcon className="size-6 shrink-0" />
				)}

				<div className="flex flex-1 flex-col gap-y-1">
					<h6 className="font-medium">Google Drive</h6>
					<p className="text-muted-foreground text-xs leading-normal">
						{isGoogleConnected ? (
							<Trans>
								Generate your resume PDF and upload it directly to Google Drive. Existing file with the same name in
								the target folder will be replaced.
							</Trans>
						) : (
							<Trans>Connect your Google account in Settings / Authentication to enable Drive upload.</Trans>
						)}
					</p>
				</div>
			</Button>

			<Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>Upload PDF to Google Drive</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>Enter a file name and optional folder path. Missing folders will be created automatically.</Trans>
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="gdrive-file-name">
								<Trans>File name</Trans>
							</Label>
							<Input
								id="gdrive-file-name"
								value={driveFileName}
								onChange={(event) => setDriveFileName(event.target.value)}
								placeholder="resume.pdf"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="gdrive-folder-path">
								<Trans>Folder path</Trans>
							</Label>
							<Input
								id="gdrive-folder-path"
								value={driveFolderPath}
								onChange={(event) => setDriveFolderPath(event.target.value)}
								placeholder="Jobs/2026/Google"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploadingToGoogleDrive}>
							<Trans>Cancel</Trans>
						</Button>
						<Button onClick={onUploadToGoogleDrive} disabled={isUploadingToGoogleDrive}>
							{isUploadingToGoogleDrive && <CircleNotchIcon className="size-4 animate-spin" />}
							<Trans>Upload</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</SectionBase>
	);
}
