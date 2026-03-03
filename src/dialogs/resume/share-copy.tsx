import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ShareIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MultipleCombobox, type MultipleComboboxOption } from "@/components/ui/multiple-combobox";
import { orpc } from "@/integrations/orpc/client";
import { type DialogProps, useDialogStore } from "../store";

const SEARCH_DEBOUNCE_MS = 300;

type UserOption = MultipleComboboxOption<string> & { name: string; username: string };

function userToOption(user: { id: string; name: string; username: string }): UserOption {
	return {
		value: user.id,
		label: (
			<span className="flex flex-col items-start gap-0 leading-tight">
				<span className="truncate">{user.name}</span>
				<span className="truncate text-muted-foreground text-xs">{user.username}</span>
			</span>
		),
		keywords: [user.name, user.username],
		name: user.name,
		username: user.username,
	};
}

export function ShareCopyDialog({ data }: DialogProps<"resume.shareCopy">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [selectedOptionsDetail, setSelectedOptionsDetail] = useState<UserOption[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [debouncedSearch] = useDebounceValue(searchQuery, SEARCH_DEBOUNCE_MS);

	const { data: users = [], isFetching: isSearchingUsers } = useQuery({
		...orpc.user.list.queryOptions({
			input: {
				search: debouncedSearch.trim() || undefined,
			},
		}),
	});
	const { mutateAsync: shareCopy, isPending } = useMutation(orpc.resume.shareCopy.mutationOptions());

	const searchResultOptions = useMemo(() => users.map(userToOption), [users]);

	const onValueChange = useCallback((values: string[], optionsSelected: MultipleComboboxOption<string>[]) => {
		setSelectedIds(values);
		setSelectedOptionsDetail((prev) =>
			values
				.map(
					(id) =>
						(optionsSelected.find((o) => o.value === id) as UserOption | undefined) ?? prev.find((o) => o.value === id),
				)
				.filter((o): o is UserOption => o != null),
		);
	}, []);

	const onSubmit = useCallback(async () => {
		if (selectedIds.length === 0) {
			toast.error(t`Select at least one user.`);
			return;
		}
		const toastId = toast.loading(t`Sharing copy to selected users...`);
		try {
			const { count } = await shareCopy({ resumeId: data.resumeId, userIds: selectedIds });
			toast.success(t`A copy was shared with ${count} user(s).`, { id: toastId });
			closeDialog();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : t`Something went wrong.`, { id: toastId });
		}
	}, [data.resumeId, selectedIds, shareCopy, closeDialog]);

	return (
		<DialogContent className="flex max-h-[85vh] flex-col">
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<ShareIcon />
					<Trans>Share copy to users</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Search and select users to send a copy. They will receive the resume in their dashboard.</Trans>
				</DialogDescription>
			</DialogHeader>

			<div className="flex flex-1 flex-col gap-2">
				<label className="font-medium text-muted-foreground text-sm">
					<Trans>Select users</Trans>
				</label>
				<MultipleCombobox
					value={selectedIds}
					options={searchResultOptions}
					onValueChange={onValueChange}
					onSearchChange={setSearchQuery}
					placeholder={t`Choose users...`}
					searchPlaceholder={t`Search by name or username...`}
					emptyMessage={isSearchingUsers ? t`Searching...` : t`No users found. Type to search.`}
					className="w-full min-w-[400px]"
					buttonProps={{
						className: "w-full justify-between",
						children: () => (
							<>
								{selectedOptionsDetail.length === 0 ? (
									<span className="text-muted-foreground">
										<Trans>Choose users...</Trans>
									</span>
								) : (
									<span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-1 overflow-visible">
										{selectedOptionsDetail.map((opt) => (
											<Badge
												key={opt.value}
												variant="secondary"
												className="flex h-auto min-h-0 shrink-0 flex-col items-start gap-0 overflow-visible whitespace-normal py-1 font-normal"
											>
												<span className="min-w-0 truncate text-sm leading-tight">{opt.name}</span>
											</Badge>
										))}
									</span>
								)}
							</>
						),
					}}
				/>
			</div>

			<DialogFooter>
				<Button variant="outline" onClick={() => closeDialog()}>
					<Trans>Cancel</Trans>
				</Button>
				<Button onClick={onSubmit} disabled={isPending || selectedIds.length === 0}>
					<Trans>Share to {selectedIds.length} user(s)</Trans>
				</Button>
			</DialogFooter>
		</DialogContent>
	);
}
