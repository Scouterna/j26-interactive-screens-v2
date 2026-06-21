import { Link, Outlet } from "@tanstack/react-router";
import { createContext, useState } from "react";

export const AuthContext = createContext<{ markUnauthorized: () => void }>({
	markUnauthorized: () => {},
});

export default function AdminLayout() {
	const [unauthorized, setUnauthorized] = useState(false);

	if (unauthorized) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-gray-50">
				<p className="text-gray-500 text-lg">
					Please log in to access this page.
				</p>
			</div>
		);
	}

	return (
		<AuthContext.Provider
			value={{ markUnauthorized: () => setUnauthorized(true) }}
		>
			<div className="min-h-screen bg-gray-50">
				<nav className="bg-white border-b border-gray-200">
					<div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">
						<div className="flex gap-1">
							<NavLink to="/admin" exact>
								Surveys
							</NavLink>
							<NavLink to="/admin/devices">Devices</NavLink>
							<NavLink to="/admin/tags">Tags</NavLink>
						</div>
					</div>
				</nav>
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
	const base =
		"px-3 py-1.5 rounded text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100";
	const active =
		"px-3 py-1.5 rounded text-sm font-medium text-gray-900 bg-gray-100";
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
