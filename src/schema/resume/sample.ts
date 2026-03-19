import { templateDefaultColors } from "../templates";
import type { ResumeData } from "./data";

export const sampleResumeData: ResumeData = {
	picture: {
		hidden: false,
		url: "https://i.imgur.com/o4Jpt1p.jpeg",
		size: 100,
		rotation: 0,
		aspectRatio: 1,
		borderRadius: 0,
		borderColor: "rgba(0, 0, 0, 0.5)",
		borderWidth: 0,
		shadowColor: "rgba(0, 0, 0, 0.5)",
		shadowWidth: 0,
	},
	basics: {
		name: "David Kowalski",
		headline: "Game Developer | Unity & Unreal Engine Specialist",
		email: "global@sun-asterisk.com",
		phone: "+1 (555) 291-4756",
		location: "Seattle, WA",
		website: {
			url: "https://sunasterisk-global.com/",
			label: "sun-asterisk.com",
		},
		customFields: [],
	},
	summary: {
		title: "",
		columns: 1,
		hidden: false,
		content:
			"<p>Est anim est quis nostrud ipsum deserunt do anim Lorem mollit nostrud minim. Est anim est quis nostrud ipsum.</p>",
	},
	sections: {
		profiles: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		experience: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		education: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		projects: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		skills: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		languages: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		interests: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		awards: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		certifications: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		publications: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		volunteer: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
		references: {
			title: "",
			columns: 1,
			hidden: false,
			items: [],
		},
	},
	customSections: [],
	metadata: {
		template: "chikorita",
		layout: {
			sidebarWidth: 30,
			pages: [
				{
					fullWidth: false,
					main: ["summary", "education", "experience"],
					sidebar: ["profiles", "skills"],
				},
			],
		},
		css: {
			enabled: false,
			value: "",
		},
		page: {
			gapX: 4,
			gapY: 8,
			marginX: 16,
			marginY: 14,
			format: "a4",
			locale: "en-US",
			hideIcons: false,
		},
		design: {
			level: {
				icon: "acorn",
				type: "circle",
			},
			colors: templateDefaultColors.chikorita ?? {
				primary: "rgba(220, 38, 38, 1)",
				text: "rgba(0, 0, 0, 1)",
				background: "rgba(255, 255, 255, 1)",
			},
		},
		typography: {
			body: {
				fontFamily: "IBM Plex Serif",
				fontWeights: ["400", "600"],
				fontSize: 11,
				lineHeight: 1.5,
			},
			heading: {
				fontFamily: "Fira Sans Condensed",
				fontWeights: ["500"],
				fontSize: 18,
				lineHeight: 1.5,
			},
		},
		notes: "",
	},
};
