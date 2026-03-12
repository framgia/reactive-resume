import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { orpc } from "@/integrations/orpc/client";
import { slugify } from "@/utils/string";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1, "Position name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreatePositionDialog(_: DialogProps<"position.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const { mutate: createPosition, isPending } = useMutation(orpc.position.create.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: "" },
	});

	const { blockEvents } = useFormBlocker(form);
	const nameWatch = form.watch("name");
	const slugPreview = nameWatch?.trim() ? slugify(nameWatch) : "";

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading(t`Creating position...`);
		createPosition(
			{ name: data.name },
			{
				onSuccess: () => {
					toast.success(t`Position created.`, { id: toastId });
					queryClient.invalidateQueries({ queryKey: orpc.position.list.queryOptions({ input: {} }).queryKey });
					closeDialog();
				},
				onError: (error) => {
					const message =
						error.message === "POSITION_SLUG_ALREADY_EXISTS"
							? t`A position with this name already exists.`
							: error.message;
					toast.error(message, { id: toastId });
				},
			},
		);
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create position</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Add a position/level (e.g. Senior Engineer, Manager) for use in resumes and projects.</Trans>
				</DialogDescription>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Name</Trans>
								</FormLabel>
								<FormControl>
									<Input {...field} placeholder={t`e.g. Senior Engineer, Manager`} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormItem>
						<FormLabel>
							<Trans>Slug</Trans>
						</FormLabel>
						<FormControl>
							<Input
								value={slugPreview}
								disabled
								className="bg-muted text-muted-foreground"
								placeholder={t`Auto-generated from name`}
							/>
						</FormControl>
						<p className="text-muted-foreground text-xs">
							<Trans>Slug is auto-generated from the name and cannot be edited.</Trans>
						</p>
					</FormItem>
					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							<Trans>Create</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdatePositionDialog({ data }: DialogProps<"position.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const { mutate: updatePosition, isPending } = useMutation(orpc.position.update.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: data.name },
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading(t`Updating position...`);
		updatePosition(
			{ id: data.id, name: values.name },
			{
				onSuccess: () => {
					toast.success(t`Position updated.`, { id: toastId });
					queryClient.invalidateQueries({ queryKey: orpc.position.list.queryOptions({ input: {} }).queryKey });
					closeDialog();
				},
				onError: (error) => {
					const message =
						error.message === "POSITION_SLUG_ALREADY_EXISTS"
							? t`A position with this name already exists.`
							: error.message;
					toast.error(message, { id: toastId });
				},
			},
		);
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update position</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Edit the position name. Slug will be auto-generated from the new name.</Trans>
				</DialogDescription>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<FormField
						control={form.control}
						name="name"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Name</Trans>
								</FormLabel>
								<FormControl>
									<Input {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormItem>
						<FormLabel>
							<Trans>Slug</Trans>
						</FormLabel>
						<FormControl>
							<Input value={data.slug} disabled className="bg-muted text-muted-foreground" />
						</FormControl>
						<p className="text-muted-foreground text-xs">
							<Trans>Slug is auto-generated and cannot be edited.</Trans>
						</p>
					</FormItem>
					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							<Trans>Save changes</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}
