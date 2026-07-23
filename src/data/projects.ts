// Project data configuration file
// Used to manage data for the project display page

export interface Project {
	id: string;
	title: string;
	description: string;
	image: string;
	category: "web" | "mobile" | "desktop" | "other";
	techStack: string[];
	status: "completed" | "in-progress" | "planned";
	liveDemo?: string;
	sourceCode?: string;
	visitUrl?: string;
	startDate: string;
	endDate?: string;
	featured?: boolean;
	tags?: string[];
	showImage?: boolean;
}

export const projectsData: Project[] = [
	{
		id: "industrial-monitor",
		title: "IndustrialMonitor",
		description:
			"基于 .NET 8 + WPF 的企业级工业设备监控控制台，采用 MVVM + 依赖注入架构，集成 LiveCharts2 实时图表、SQLite 数据持久化、基于角色的访问控制（RBAC）和配置热重载。",
		image: "/assets/projects/IndustrialMonitor.webp",
		category: "desktop",
		techStack: [".NET 8", "WPF", "C#", "MVVM", "LiveCharts2", "SQLite"],
		status: "completed",
		sourceCode: "https://github.com/ray-adas2/IndustrialMonitor",
		startDate: "2025-01-01",
		endDate: "2026-07-01",
		featured: true,
		tags: ["工业监控", "WPF", ".NET"],
	},
];

// Get project statistics
export const getProjectStats = () => {
	const total = projectsData.length;
	const completed = projectsData.filter((p) => p.status === "completed").length;
	const inProgress = projectsData.filter(
		(p) => p.status === "in-progress",
	).length;
	const planned = projectsData.filter((p) => p.status === "planned").length;

	return {
		total,
		byStatus: {
			completed,
			inProgress,
			planned,
		},
	};
};

// Get projects by category
export const getProjectsByCategory = (category?: string) => {
	if (!category || category === "all") {
		return projectsData;
	}
	return projectsData.filter((p) => p.category === category);
};

// Get featured projects
export const getFeaturedProjects = () => {
	return projectsData.filter((p) => p.featured);
};

// Get all tech stacks
export const getAllTechStack = () => {
	const techSet = new Set<string>();
	projectsData.forEach((project) => {
		project.techStack.forEach((tech) => {
			techSet.add(tech);
		});
	});
	return Array.from(techSet).sort();
};
