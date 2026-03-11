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
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1, "Domain name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateDomainDialog(_: DialogProps<"domain.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const { mutate: createDomain, isPending } = useMutation(orpc.domain.create.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: "" },
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading(t`Creating domain...`);
		createDomain(
			{ name: data.name },
			{
				onSuccess: () => {
					toast.success(t`Domain created.`, { id: toastId });
					queryClient.invalidateQueries({ queryKey: orpc.domain.list.queryOptions({ input: {} }).queryKey });
					closeDialog();
				},
				onError: (error) => {
					const message =
						error.message === "DOMAIN_NAME_ALREADY_EXISTS"
							? t`A domain with this name already exists.`
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
					<Trans>Create domain</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Add a domain name to use when assigning projects.</Trans>
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
									<Input {...field} placeholder={t`e.g. Healthcare, Finance`} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
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

export function UpdateDomainDialog({ data }: DialogProps<"domain.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const { mutate: updateDomain, isPending } = useMutation(orpc.domain.update.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: data.name },
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading(t`Updating domain...`);
		updateDomain(
			{ id: data.id, name: values.name },
			{
				onSuccess: () => {
					toast.success(t`Domain updated.`, { id: toastId });
					queryClient.invalidateQueries({ queryKey: orpc.domain.list.queryOptions({ input: {} }).queryKey });
					closeDialog();
				},
				onError: (error) => {
					const message =
						error.message === "DOMAIN_NAME_ALREADY_EXISTS"
							? t`A domain with this name already exists.`
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
					<Trans>Update domain</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Edit the domain name.</Trans>
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
