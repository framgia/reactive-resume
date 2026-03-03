import type { BetterAuthClientPlugin } from "better-auth/client";
import type { packtech } from "./index";

export const packtechClient = () => {
	return {
		id: "packtech-client",
		$InferServerPlugin: {} as ReturnType<typeof packtech>,
		pathMethods: {
			"/sign-in/packtech": "POST",
		},
		atomListeners: [
			{
				matcher: (path) => path === "/sign-in/packtech",
				signal: "$sessionSignal",
			},
		],
	} satisfies BetterAuthClientPlugin;
};
