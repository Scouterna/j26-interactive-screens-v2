import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Pin } from "shared";
import worldData from "world-atlas/countries-110m.json";

type WorldTopology = Topology<{ countries: Parameters<typeof feature>[1] extends string ? never : object }>;

const countries = feature(worldData as unknown as WorldTopology, "countries" as Parameters<typeof feature>[1]);

const EE_RATIO = 0.487;

interface Props {
	pins: Pin[];
	daylight: boolean;
	width: number;
}

export default function WorldMap({ pins, daylight, width }: Props) {
	const svgHeight = Math.round(width * EE_RATIO);
	const projection = geoEqualEarth().fitExtent(
		[[0, 0], [width, svgHeight]],
		{ type: "Sphere" }
	);
	const [tx, ty] = projection.translate();
	projection.translate([tx - width * 0.05, ty]);
	const pathGen = geoPath(projection);

	const ocean = daylight ? "#bfdbfe" : "#1e3a5f";
	const fill = daylight ? "#ffffff" : "#374151";
	const stroke = daylight ? "#e2e8f0" : "#4b5563";

	return (
		<svg width={width} height={svgHeight}>
			<defs>
				<style>{"@keyframes pin-fade{from{opacity:1}to{opacity:0}}"}</style>
			</defs>
			<rect width={width} height={svgHeight} fill={ocean} />
			{"features" in countries && countries.features.map((f, i) => (
				<path key={i} d={pathGen(f) ?? ""} fill={fill} stroke={stroke} strokeWidth={0.5} />
			))}
			{pins.map((pin) => {
				const pos = projection([pin.lng, pin.lat]);
				if (!pos) return null;
				const [x, y] = pos;
				const lifetime = (new Date(pin.expiresAt).getTime() - new Date(pin.scannedAt).getTime()) / 1000;
				const elapsed = Math.max(0, (Date.now() - new Date(pin.scannedAt).getTime()) / 1000);
				return (
					<g key={pin.tagId} style={{ animation: `pin-fade ${lifetime}s linear forwards`, animationDelay: `-${elapsed}s` }}>
						<circle cx={x} cy={y} r={4} fill="#f59e0b" />
						<circle cx={x} cy={y} r={4} fill="#f59e0b" opacity={0.4}>
							<animate attributeName="r" values="4;10;4" dur="3s" repeatCount="indefinite" />
							<animate attributeName="opacity" values="0.4;0;0.4" dur="3s" repeatCount="indefinite" />
						</circle>
					</g>
				);
			})}
		</svg>
	);
}
