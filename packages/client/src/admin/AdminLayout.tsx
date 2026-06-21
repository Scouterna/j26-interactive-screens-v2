import { Link, Outlet } from "@tanstack/react-router";
import { createContext, useEffect, useState } from "react";
import { AuthError, fetchMe } from "../api";

export const AuthContext = createContext<{ markUnauthorized: () => void; roles: string[] }>({
	markUnauthorized: () => {},
	roles: [],
});

function canAccess(roles: string[], resource: string) {
	return roles.some((r) => r === `${resource}:read` || r === `${resource}:write`);
}

export default function AdminLayout() {
	const [roles, setRoles] = useState<string[] | null>(null);
	const [unauthorized, setUnauthorized] = useState(false);

	useEffect(() => {
		fetchMe()
			.then((me) => setRoles(me.roles))
			.catch((err: unknown) => {
				if (err instanceof AuthError) setUnauthorized(true);
			});
	}, []);

	if (unauthorized) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<p className="text-gray-500 text-lg">Please log in to access this page.</p>
			</div>
		);
	}

	const resolvedRoles = roles ?? [];
	const tabs = [
		{ label: "Surveys", to: "/admin", exact: true, show: canAccess(resolvedRoles, "surveys") },
		{ label: "Tags", to: "/admin/tags", show: canAccess(resolvedRoles, "tags") },
		{ label: "Devices", to: "/admin/devices", show: canAccess(resolvedRoles, "devices") },
	].filter((t) => t.show);

	return (
		<AuthContext.Provider value={{ markUnauthorized: () => setUnauthorized(true), roles: resolvedRoles }}>
			<div className="min-h-screen bg-gray-50">
				{tabs.length > 1 && (
					<nav className="bg-white border-b border-gray-200">
						<div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">
							<div className="flex gap-1">
								{tabs.map((tab) => (
									<NavLink key={tab.to} to={tab.to} exact={tab.exact}>
										{tab.label}
									</NavLink>
								))}
							</div>
						</div>
					</nav>
				)}
				<main className="max-w-5xl mx-auto px-6 py-8">
					<Outlet />
				</main>
			</div>
		</AuthContext.Provider>
	);
}

function NavLink({
	to,
	exact,
	children,
}: {
	to: string;
	exact?: boolean;
	children: React.ReactNode;
}) {
	const base = "px-3 py-1.5 rounded text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100";
	const active = "px-3 py-1.5 rounded text-sm font-medium text-gray-900 bg-gray-100";
	return (
		<Link
			to={to}
			className={base}
			activeProps={{ className: active }}
			activeOptions={exact ? { exact: true } : undefined}
		>
			{children}
		</Link>
	);
}
