import {
	createRootRoute,
	createRoute,
	createRouter,
	Outlet,
	RouterProvider,
	redirect,
	useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import AdminLayout from "./admin/AdminLayout";
import DeviceList from "./admin/DeviceList";
import SurveyDetail from "./admin/SurveyDetail";
import SurveyEdit from "./admin/SurveyEdit";
import SurveyList from "./admin/SurveyList";
import TagsPage from "./admin/TagsPage";
import { BASE_PATH } from "./config";
import DisplayView from "./display/DisplayView";

function NavigationListener() {
	const href = useRouterState({ select: (s) => s.location.href });
	useEffect(() => {
		window.parent.postMessage(
			{ type: "j26:navigate", url: BASE_PATH + href },
			window.location.origin,
		);
		console.log({ type: "j26:navigate", url: window.location.origin + href });
	}, [href]);
	return null;
}

const rootRoute = createRootRoute({
	component: () => (
		<>
			<NavigationListener />
			<Outlet />
		</>
	),
});

const indexRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	beforeLoad: () => {
		throw redirect({ to: "/admin" });
	},
});

const adminRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "admin",
	component: AdminLayout,
});

const adminIndexRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "/",
	component: SurveyList,
});

const surveyDetailRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "surveys/$id",
	component: SurveyDetail,
});

const surveyEditRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "surveys/$id/edit",
	component: SurveyEdit,
});

const devicesRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "devices",
	component: DeviceList,
});

const tagsRoute = createRoute({
	getParentRoute: () => adminRoute,
	path: "tags",
	component: TagsPage,
});

const displayRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "display/$surveyId",
	component: DisplayView,
});

const routeTree = rootRoute.addChildren([
	indexRoute,
	adminRoute.addChildren([
		adminIndexRoute,
		surveyDetailRoute,
		surveyEditRoute,
		devicesRoute,
		tagsRoute,
	]),
	displayRoute,
]);

const router = createRouter({ routeTree, basepath: BASE_PATH });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

export default function App() {
	return <RouterProvider router={router} />;
}
