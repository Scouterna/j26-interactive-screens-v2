import { useEffect, useRef, useState } from "react";
import type { MapDisplayState } from "shared";
import BannerDivider from "./BannerDivider";
import SwedenMap from "./SwedenMap";
import WorldMap from "./WorldMap";

interface Props {
	state: MapDisplayState;
	daylight: boolean;
}

export default function MapDisplay({ state, daylight }: Props) {
	const worldRef = useRef<HTMLDivElement>(null);
	const swedenRef = useRef<HTMLDivElement>(null);
	const [worldWidth, setWorldWidth] = useState(0);
	const [swedenDims, setSwedenDims] = useState<[number, number]>([0, 0]);

	useEffect(() => {
		const obs = new ResizeObserver(() => {
			if (worldRef.current) setWorldWidth(worldRef.current.clientWidth);
			if (swedenRef.current) {
				setSwedenDims([swedenRef.current.clientWidth, swedenRef.current.clientHeight]);
			}
		});
		if (worldRef.current) obs.observe(worldRef.current);
		if (swedenRef.current) obs.observe(swedenRef.current);
		return () => obs.disconnect();
	}, []);

	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		const id = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);
	const activePins = state.pins.filter((p) => new Date(p.expiresAt) > now);
	const bg = daylight ? "bg-white" : "bg-gray-950";

	return (
		<div className={`h-screen flex flex-col overflow-hidden ${bg}`}>
			<div ref={worldRef} className="flex-none w-full">
				{worldWidth > 0 && (
					<WorldMap pins={activePins} daylight={daylight} width={worldWidth} />
				)}
			</div>
			<div className="relative flex-none overflow-visible" style={{ height: 20, zIndex: 10 }}>
				<div className="absolute left-0 right-0" style={{ top: "50%", transform: "translateY(-75%)" }}>
					<BannerDivider />
				</div>
			</div>
			<div ref={swedenRef} className="flex-1 overflow-hidden">
				{swedenDims[0] > 0 && (
					<SwedenMap
						pins={activePins}
						daylight={daylight}
						width={swedenDims[0]}
						height={swedenDims[1]}
					/>
				)}
			</div>
		</div>
	);
}
