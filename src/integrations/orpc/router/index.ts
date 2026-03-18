import { aiRouter } from "./ai";
import { authRouter } from "./auth";
import { domainRouter } from "./domain";
import { customerRouter } from "./customer";
import { flagsRouter } from "./flags";
import { positionRouter } from "./position";
import { printerRouter } from "./printer";
import { projectRouter } from "./project";
import { resumeRouter } from "./resume";
import { skillRouter } from "./skill";
import { statisticsRouter } from "./statistics";
import { storageRouter } from "./storage";
import { userRouter } from "./user";

export default {
	ai: aiRouter,
	auth: authRouter,
	domain: domainRouter,
	customer: customerRouter,
	flags: flagsRouter,
	resume: resumeRouter,
	position: positionRouter,
	skill: skillRouter,
	storage: storageRouter,
	printer: printerRouter,
	statistics: statisticsRouter,
	user: userRouter,
	project: projectRouter,
};
