import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleLineIcon, PlusIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import z from "zod";
import { DomainSelect } from "@/components/domain/domain-select";
import { ChipInputAutocomplete } from "@/components/input/chip-input-autocomplete";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { orpc } from "@/integrations/orpc/client";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	name: z.string().min(1, "Project name is required"),
	description: z.string().optional(),
	customerName: z.string().optional(),
	skills: z.array(z.string()),
	position: z.array(z.string()),
	domainIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

const SUGGESTION_DEBOUNCE_MS = 150;

function ProjectForm() {
	const control = useFormContext<FormValues>().control;
	const [skillInput, setSkillInput] = useState("");
	const [positionInput, setPositionInput] = useState("");
	const [debouncedSkillInput] = useDebounceValue(skillInput, SUGGESTION_DEBOUNCE_MS);
	const [debouncedPositionInput] = useDebounceValue(positionInput, SUGGESTION_DEBOUNCE_MS);

	const { data: skillOptions = [] } = useQuery(
		orpc.skill.list.queryOptions({ input: { query: debouncedSkillInput.trim() || undefined, limit: 15 } }),
	);
	const { data: positionOptions = [] } = useQuery(
		orpc.position.list.queryOptions({ input: { query: debouncedPositionInput.trim() || undefined, limit: 15 } }),
	);

	return (
		<>
			<FormField
				control={control}
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
				control={control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Description</Trans>
						</FormLabel>
						<FormControl>
							<Textarea {...field} value={field.value ?? ""} rows={3} className="resize-none" />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="customerName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Customer name</Trans>
						</FormLabel>
						<FormControl>
							<Input {...field} value={field.value ?? ""} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="skills"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Skills</Trans>
						</FormLabel>
						<FormControl>
							<ChipInputAutocomplete
								value={field.value ?? []}
								onChange={field.onChange}
								suggestions={skillOptions.map((s) => s.name)}
								onInputChange={setSkillInput}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={control}
				name="position"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Positions</Trans>
						</FormLabel>
						<FormControl>
							<ChipInputAutocomplete
								value={field.value ?? []}
								onChange={field.onChange}
								suggestions={positionOptions.map((p) => p.name)}
								onInputChange={setPositionInput}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={useFormContext<FormValues>().control}
				name="domainIds"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Domains</Trans>
						</FormLabel>
						<FormControl>
							<DomainSelect value={field.value} onChange={field.onChange} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
}

export function CreateProjectDialog(_: DialogProps<"project.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);
	const { mutate: createProject, isPending } = useMutation(orpc.project.create.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			customerName: "",
			skills: [],
			position: [],
			domainIds: [],
		},
	});

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading(t`Creating project...`);

		createProject(
			{
				name: data.name,
				description: data.description || undefined,
				customerName: data.customerName || undefined,
				skills: data.skills?.length ? data.skills : undefined,
				position: data.position?.length ? data.position : undefined,
				domainIds: data.domainIds?.length ? data.domainIds : undefined,
			},
			{
				onSuccess: () => {
					toast.success(t`Project created successfully.`, { id: toastId });
					closeDialog();
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new project</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Add a project with name, description, and customer.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ProjectForm />

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

export function UpdateProjectDialog({ data }: DialogProps<"project.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { data: project, isLoading: projectLoading } = useQuery(
		orpc.project.getById.queryOptions({ input: { id: data.id } }),
	);
	const { mutate: updateProject, isPending } = useMutation(orpc.project.update.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: data.name,
			description: data.description ?? "",
			customerName: data.customerName ?? "",
			skills: [],
			position: [],
			domainIds: [],
		},
	});

	useEffect(() => {
		if (!project) return;
		form.reset({
			name: project.name,
			description: project.description ?? "",
			customerName: project.customerName ?? "",
			skills: project.skills?.map((s) => s.name) ?? [],
			position: project.position?.map((p) => p.name) ?? [],
			domainIds: project.domainIds,
		});
	}, [project]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading(t`Updating project...`);

		updateProject(
			{
				id: data.id,
				name: values.name,
				description: values.description || null,
				customerName: values.customerName || null,
				skills: values.skills,
				position: values.position,
				domainIds: values.domainIds,
			},
			{
				onSuccess: () => {
					toast.success(t`Project updated successfully.`, { id: toastId });
					closeDialog();
				},
				onError: (error) => {
					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	if (projectLoading || !project) {
		return (
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-x-2">
						<PencilSimpleLineIcon />
						<Trans>Update project</Trans>
					</DialogTitle>
				</DialogHeader>
				<div className="py-6 text-center text-muted-foreground">
					<Trans>Loading...</Trans>
				</div>
			</DialogContent>
		);
	}

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Update project</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Edit project details.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ProjectForm />

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
