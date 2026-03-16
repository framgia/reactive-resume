import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, MagicWandIcon, PencilSimpleLineIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import type { Resolver } from "react-hook-form";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { ChipInput } from "@/components/input/chip-input";
import { PositionCombobox } from "@/components/position/position-combobox";
import { ProjectCombobox } from "@/components/project/project-combobox";
import { SkillCombobox } from "@/components/skill/skill-combobox";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/integrations/auth/client";
import { orpc, type RouterInput } from "@/integrations/orpc/client";
import { generateId, generateRandomName, slugify } from "@/utils/string";
import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
	id: z.string(),
	name: z.string().min(1).max(64),
	slug: z.string().min(1).max(64).transform(slugify),
	tags: z.array(z.string()),
	projectId: z.string().nullable().optional(),
	skillIds: z.array(z.string()).default([]),
	positionId: z.string().nullable().optional(),
});

type FormValues = z.output<typeof formSchema>;

export function CreateResumeDialog(_: DialogProps<"resume.create">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: createResume, isPending } = useMutation(orpc.resume.create.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues: {
			id: generateId(),
			name: "",
			slug: "",
			tags: [],
			projectId: null,
			skillIds: [],
			positionId: null,
		},
	});

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (data: FormValues) => {
		const toastId = toast.loading(t`Creating your resume...`);

		createResume(
			{
				name: data.name,
				slug: data.slug,
				tags: data.tags,
				projectId: data.projectId ?? undefined,
				skillIds: data.skillIds ?? [],
				positionId: data.positionId ?? undefined,
			},
			{
				onSuccess: () => {
					toast.success(t`Your resume has been created successfully.`, { id: toastId });
					closeDialog();
				},
				onError: (error) => {
					if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
						toast.error(t`A resume with this slug already exists.`, { id: toastId });
						return;
					}

					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	const onCreateSampleResume = () => {
		const values = form.getValues();
		const randomName = generateRandomName();

		const data = {
			name: values.name || randomName,
			slug: values.slug || slugify(randomName),
			tags: values.tags,
			withSampleData: true,
		} satisfies RouterInput["resume"]["create"];

		const toastId = toast.loading(t`Creating your resume...`);

		createResume(data, {
			onSuccess: () => {
				toast.success(t`Your resume has been created successfully.`, { id: toastId });
				closeDialog();
			},
			onError: (error) => {
				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PlusIcon />
					<Trans>Create a new resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Start building your resume by giving it a name.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />
					<CreateResumeOverallFields />

					<DialogFooter>
						<ButtonGroup aria-label="Create Resume with Options" className="gap-x-px rtl:flex-row-reverse">
							<Button type="submit" disabled={isPending}>
								<Trans>Create</Trans>
							</Button>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button size="icon" disabled={isPending}>
										<CaretDownIcon />
									</Button>
								</DropdownMenuTrigger>

								<DropdownMenuContent align="end" className="w-fit">
									<DropdownMenuItem onSelect={onCreateSampleResume}>
										<TestTubeIcon />
										<Trans>Create a Sample Resume</Trans>
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</ButtonGroup>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function UpdateResumeDialog({ data }: DialogProps<"resume.update">) {
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { data: resume, isLoading: resumeLoading } = useQuery(
		orpc.resume.getById.queryOptions({ input: { id: data.id } }),
	);
	const { mutate: updateResume, isPending } = useMutation(orpc.resume.update.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues: {
			id: data.id,
			name: data.name,
			slug: data.slug,
			tags: data.tags,
			projectId: null,
			skillIds: [],
			positionId: null,
		},
	});

	useEffect(() => {
		if (!resume) return;
		form.reset({
			id: resume.id,
			name: resume.name,
			slug: resume.slug,
			tags: resume.tags,
			projectId: resume.projectId ?? null,
			skillIds: resume.skills?.map((s) => s.id) ?? [],
			positionId: resume.positionId ?? null,
		});
	}, [resume, form]);

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		if (!name) return;
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading(t`Updating your resume...`);

		updateResume(
			{
				id: values.id,
				name: values.name,
				slug: values.slug,
				tags: values.tags,
				projectId: values.projectId ?? undefined,
				skillIds: values.skillIds,
				positionId: values.positionId ?? undefined,
			},
			{
				onSuccess: () => {
					toast.success(t`Your resume has been updated successfully.`, { id: toastId });
					closeDialog();
				},
				onError: (error) => {
					if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
						toast.error(t`A resume with this slug already exists.`, { id: toastId });
						return;
					}

					toast.error(error.message, { id: toastId });
				},
			},
		);
	};

	if (resumeLoading || !resume) {
		return (
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-x-2">
						<PencilSimpleLineIcon />
						<Trans>Update Resume</Trans>
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
					<Trans>Update Resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Changed your mind? Rename your resume to something more descriptive.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />
					<CreateResumeOverallFields />

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							<Trans>Save Changes</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

export function DuplicateResumeDialog({ data }: DialogProps<"resume.duplicate">) {
	const navigate = useNavigate();
	const closeDialog = useDialogStore((state) => state.closeDialog);

	const { mutate: duplicateResume, isPending } = useMutation(orpc.resume.duplicate.mutationOptions());

	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema) as Resolver<FormValues>,
		defaultValues: {
			id: data.id,
			name: `${data.name} (Copy)`,
			slug: `${data.slug}-copy`,
			tags: data.tags,
			projectId: null,
			skillIds: [],
			positionId: null,
		},
	});

	const name = useWatch({ control: form.control, name: "name" });

	useEffect(() => {
		if (!name) return;
		form.setValue("slug", slugify(name), { shouldDirty: true });
	}, [form, name]);

	const { blockEvents } = useFormBlocker(form);

	const onSubmit = (values: FormValues) => {
		const toastId = toast.loading(t`Duplicating your resume...`);

		duplicateResume(values, {
			onSuccess: async (id) => {
				toast.success(t`Your resume has been duplicated successfully.`, { id: toastId });
				closeDialog();

				if (data.shouldRedirect) {
					navigate({ to: `/builder/$resumeId`, params: { resumeId: id } });
				}
			},
			onError: (error) => {
				toast.error(error.message, { id: toastId });
			},
		});
	};

	return (
		<DialogContent {...blockEvents}>
			<DialogHeader>
				<DialogTitle className="flex items-center gap-x-2">
					<PencilSimpleLineIcon />
					<Trans>Duplicate Resume</Trans>
				</DialogTitle>
				<DialogDescription>
					<Trans>Duplicate your resume to create a new one, just like the original.</Trans>
				</DialogDescription>
			</DialogHeader>

			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
					<ResumeForm />
					<CreateResumeOverallFields />

					<DialogFooter>
						<Button type="submit" disabled={isPending}>
							<Trans>Duplicate</Trans>
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</DialogContent>
	);
}

function CreateResumeOverallFields() {
	const form = useFormContext<FormValues>();
	const projectId = useWatch({ control: form.control, name: "projectId" });

	const { data: project } = useQuery({
		...orpc.project.getById.queryOptions({ input: { id: projectId ?? "" } }),
		enabled: Boolean(projectId),
	});

	return (
		<>
			<FormField
				control={form.control}
				name="projectId"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Project</Trans>
						</FormLabel>
						<FormControl>
							<ProjectCombobox
								value={field.value ?? undefined}
								onValueChange={field.onChange}
								className="w-full justify-between font-normal"
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
			{projectId && project && (
				<>
					<FormField
						control={form.control}
						name="skillIds"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Skills</Trans>
								</FormLabel>
								<FormControl>
									<SkillCombobox multiple value={field.value ?? []} onChange={field.onChange} projectId={projectId} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="positionId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>
									<Trans>Position</Trans>
								</FormLabel>
								<FormControl>
									<PositionCombobox
										value={field.value ?? null}
										onChange={(value) => field.onChange(value)}
										projectId={projectId}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</>
			)}
		</>
	);
}

function ResumeForm() {
	const form = useFormContext<FormValues>();
	const { data: session } = authClient.useSession();

	const slugPrefix = useMemo(() => {
		return `${window.location.origin}/${session?.user.username ?? ""}/`;
	}, [session]);

	const onGenerateName = () => {
		form.setValue("name", generateRandomName(), { shouldDirty: true });
	};

	return (
		<>
			<FormField
				control={form.control}
				name="name"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Name</Trans>
						</FormLabel>
						<div className="flex items-center gap-x-2">
							<FormControl>
								<Input min={1} max={64} {...field} />
							</FormControl>

							<Button size="icon" variant="outline" title={t`Generate a random name`} onClick={onGenerateName}>
								<MagicWandIcon />
							</Button>
						</div>
						<FormMessage />
						<FormDescription>
							<Trans>Tip: You can name the resume referring to the position you are applying for.</Trans>
						</FormDescription>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="slug"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Slug</Trans>
						</FormLabel>
						<FormControl>
							<InputGroup>
								<InputGroupAddon align="inline-start" className="hidden sm:flex">
									<InputGroupText>{slugPrefix}</InputGroupText>
								</InputGroupAddon>
								<InputGroupInput min={1} max={64} className="ps-0!" {...field} />
							</InputGroup>
						</FormControl>
						<FormMessage />
						<FormDescription>
							<Trans>This is a URL-friendly name for your resume.</Trans>
						</FormDescription>
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="tags"
				render={({ field }) => (
					<FormItem>
						<FormLabel>
							<Trans>Tags</Trans>
						</FormLabel>
						<FormControl>
							<ChipInput {...field} />
						</FormControl>
						<FormMessage />
						<FormDescription>
							<Trans>Tags can be used to categorize your resume by keywords.</Trans>
						</FormDescription>
					</FormItem>
				)}
			/>
		</>
	);
}
