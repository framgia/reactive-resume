import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { DomainCombobox } from "@/components/domain/domain-combobox";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { client, orpc } from "@/integrations/orpc/client";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1, "Customer name is required"),
	domainIds: z.array(z.string()),
});

type FormValues = {
	name: string;
	domainIds: string[];
};

export function CreateCustomerDialog(_: DialogProps<"customer.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: "", domainIds: [] },
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = async (data: FormValues) => {
		const toastId = toast.loading(t`Creating customer...`);
		try {
			const id = await client.customer.create({ name: data.name });
			// Save domains if any were selected
			if (data.domainIds.length > 0) {
				await client.customer.setDomains({ id, domainIds: data.domainIds });
			}
			toast.success(t`Customer created.`, { id: toastId });
			queryClient.invalidateQueries({ queryKey: orpc.customer.list.queryOptions({ input: {} }).queryKey });
			closeDialog();
		} catch (error: unknown) {
			const message =
				error instanceof Error && error.message === "CUSTOMER_NAME_ALREADY_EXISTS"
					? t`A customer with this name already exists.`
					: error instanceof Error
						? error.message
						: String(error);
			toast.error(message, { id: toastId });
		}
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create customer</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Add a customer to assign projects and domains.</Trans>
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
									<Input {...field} placeholder={t`e.g. ACME Corp`} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="domainIds"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Domains</Trans>
								</FormLabel>
								<FormControl>
									<DomainCombobox
										multiple
										value={field.value}
										onValueChange={(value) => field.onChange(value)}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<DialogFooter>
						<Button type="submit">
							<Trans>Create</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdateCustomerDialog({ data }: DialogProps<"customer.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const queryClient = useQueryClient();

	const { data: customer } = useQuery(
		orpc.customer.getById.queryOptions({ input: { id: data.id } }),
	);

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: { name: data.name, domainIds: [] },
	});

	const { blockEvents } = useFormBlocker(form);

	useEffect(() => {
		if (!customer) return;
		form.reset({
			// @ts-expect-error – extended fields from customerDto.getById
			name: customer.name,
			// @ts-expect-error – extended fields from customerDto.getById
			domainIds: customer.domainIds ?? [],
		});
	}, [customer, form]);

	const onSubmit = async (values: FormValues) => {
		const toastId = toast.loading(t`Updating customer...`);
		try {
			await client.customer.update({ id: data.id, name: values.name });
			// Update domains if provided (optional; if left empty we don't change them).
			if (values.domainIds && values.domainIds.length > 0) {
				await client.customer.setDomains({ id: data.id, domainIds: values.domainIds });
			}
			toast.success(t`Customer updated.`, { id: toastId });
			queryClient.invalidateQueries({ queryKey: orpc.customer.list.queryOptions({ input: {} }).queryKey });
			closeDialog();
		} catch (error: unknown) {
			const message =
				error instanceof Error && error.message === "CUSTOMER_NAME_ALREADY_EXISTS"
					? t`A customer with this name already exists.`
					: error instanceof Error
						? error.message
						: String(error);
			toast.error(message, { id: toastId });
		}
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update customer</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Edit the customer name.</Trans>
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
					<FormField
						control={form.control}
						name="domainIds"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Domains</Trans>
								</FormLabel>
								<FormControl>
									<DomainCombobox
										multiple
										value={field.value}
										onValueChange={(value) => field.onChange(value)}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<DialogFooter>
						<Button type="submit">
							<Trans>Save changes</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

