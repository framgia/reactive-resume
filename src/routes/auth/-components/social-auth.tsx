import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { EyeIcon, EyeSlashIcon, GithubLogoIcon, GoogleLogoIcon, VaultIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useToggle } from "usehooks-ts";
import z from "zod";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

const packtechFormSchema = z.object({
	identifier: z.string().trim().toLowerCase(),
	password: z.string().trim().min(6).max(64),
});

type PacktechFormValues = z.infer<typeof packtechFormSchema>;

export function SocialAuth() {
	const router = useRouter();
	const navigate = useNavigate();
	const { data: authProviders = {} } = useQuery(orpc.auth.providers.list.queryOptions());
	const [isPacktechDialogOpen, setIsPacktechDialogOpen] = useState(false);
	const [showPacktechPassword, toggleShowPacktechPassword] = useToggle(false);

	const packtechForm = useForm<PacktechFormValues>({
		resolver: zodResolver(packtechFormSchema),
		defaultValues: {
			identifier: "",
			password: "",
		},
	});

	const handleSocialLogin = async (provider: string) => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.social({
			provider,
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		router.invalidate();
	};

	const handleOAuthLogin = async () => {
		const toastId = toast.loading(t`Signing in...`);

		const { error } = await authClient.signIn.oauth2({
			providerId: "custom",
			callbackURL: "/dashboard",
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		router.invalidate();
	};

	const handlePacktechLogin = async (data: PacktechFormValues) => {
		const toastId = toast.loading(t`Signing in with Packtech...`);

		const { error } = await authClient.signIn.packtech({
			login: data.identifier,
			password: data.password,
		});

		if (error) {
			toast.error(error.message, { id: toastId });
			return;
		}

		toast.dismiss(toastId);
		setIsPacktechDialogOpen(false);
		packtechForm.reset();
		router.invalidate();
		navigate({ to: "/dashboard", replace: true });
	};

	return (
		<>
			<div className="flex items-center gap-x-2">
				<hr className="flex-1" />
				<span className="font-medium text-xs tracking-wide">
					<Trans context="Choose to authenticate with a social provider (Google, GitHub, etc.) instead of email and password">
						or continue with
					</Trans>
				</span>
				<hr className="flex-1" />
			</div>

			<div>
				<div className="grid grid-cols-2 gap-4">
					<Button
						variant="secondary"
						onClick={handleOAuthLogin}
						className={cn("hidden", "custom" in authProviders && "inline-flex")}
					>
						<VaultIcon />
						{authProviders.custom}
					</Button>

					<Button
						onClick={() => handleSocialLogin("google")}
						className={cn(
							"hidden flex-1 bg-[#4285F4] text-white hover:bg-[#4285F4]/80",
							"google" in authProviders && "inline-flex",
						)}
					>
						<GoogleLogoIcon />
						Google
					</Button>

					<Button
						onClick={() => handleSocialLogin("github")}
						className={cn(
							"hidden flex-1 bg-[#2b3137] text-white hover:bg-[#2b3137]/80",
							"github" in authProviders && "inline-flex",
						)}
					>
						<GithubLogoIcon />
						GitHub
					</Button>

					<Button
						onClick={() => setIsPacktechDialogOpen(true)}
						className={cn(
							"hidden flex-1 bg-red-600 text-white hover:bg-red-600/80",
							"packtech" in authProviders && "inline-flex",
						)}
					>
						Packtech
					</Button>
				</div>
			</div>

			<Dialog
				open={isPacktechDialogOpen}
				onOpenChange={(isOpen) => {
					setIsPacktechDialogOpen(isOpen);

					if (!isOpen) {
						packtechForm.reset();
					}
				}}
			>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>
							<Trans>Sign in with Packtech</Trans>
						</DialogTitle>
						<DialogDescription>
							<Trans>Enter your email/username and password to continue.</Trans>
						</DialogDescription>
					</DialogHeader>

					<Form {...packtechForm}>
						<form className="space-y-6" onSubmit={packtechForm.handleSubmit(handlePacktechLogin)}>
							<FormField
								control={packtechForm.control}
								name="identifier"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<Trans>Email Address</Trans>
										</FormLabel>
										<FormControl>
											<Input
												autoComplete="section-login username"
												placeholder="john.doe@example.com"
												className="lowercase"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={packtechForm.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											<Trans>Password</Trans>
										</FormLabel>
										<div className="flex items-center gap-x-1.5">
											<FormControl>
												<Input
													min={6}
													max={64}
													type={showPacktechPassword ? "text" : "password"}
													autoComplete="section-login current-password"
													{...field}
												/>
											</FormControl>

											<Button type="button" size="icon" variant="ghost" onClick={toggleShowPacktechPassword}>
												{showPacktechPassword ? <EyeIcon /> : <EyeSlashIcon />}
											</Button>
										</div>
										<FormMessage />
									</FormItem>
								)}
							/>

							<DialogFooter>
								<Button type="button" variant="outline" onClick={() => setIsPacktechDialogOpen(false)}>
									<Trans>Cancel</Trans>
								</Button>
								<Button type="submit" disabled={packtechForm.formState.isSubmitting}>
									<Trans>Sign in</Trans>
								</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</>
	);
}
