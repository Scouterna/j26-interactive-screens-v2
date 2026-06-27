import { geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { Pin } from "shared";
import worldData from "world-atlas/countries-50m.json";

const SWEDEN_ID = "752";

type WorldTopology = Topology<{ countries: GeometryCollection }>;

const worldTopology = worldData as unknown as WorldTopology;
const allCountries = feature(worldTopology, worldTopology.objects.countries);
const sweden = allCountries.features.find((f) => f.id === SWEDEN_ID) ?? null;
const otherCountries = allCountries.features.filter((f) => f.id !== SWEDEN_ID);

function withinSweden(pin: Pin) {
	return pin.lat >= 55 && pin.lat <= 70 && pin.lng >= 10 && pin.lng <= 25;
}

interface Props {
	pins: Pin[];
	daylight: boolean;
	width: number;
	height: number;
}

export default function SwedenMap({ pins, daylight, width, height }: Props) {
	if (!sweden) return null;

	// Fit Sweden in the middle of the SVG with generous padding to show surrounding region
	const pad = Math.min(width, height) * 0.15;
	const projection = geoMercator().fitExtent(
		[[pad, pad], [width - pad, height - pad]],
		sweden
	);
	const pathGen = geoPath(projection);
	const swedenPins = pins.filter(withinSweden);

	const ocean = daylight ? "#bfdbfe" : "#1e3a5f";
	const land = daylight ? "#ffffff" : "#374151";
	const landStroke = daylight ? "#e2e8f0" : "#4b5563";
	const swedenFill = daylight ? "#bbf7d0" : "#14532d";
	const swedenStroke = daylight ? "#86efac" : "#22c55e";

	return (
		<svg width={width} height={height}>
			<defs>
				<style>{"@keyframes pin-fade{from{opacity:1}to{opacity:0}}"}</style>
			</defs>
			<rect width={width} height={height} fill={ocean} />
			{otherCountries.map((f, i) => (
				<path key={i} d={pathGen(f) ?? ""} fill={land} stroke={landStroke} strokeWidth={0.5} />
			))}
			<path d={pathGen(sweden) ?? ""} fill={swedenFill} stroke={swedenStroke} strokeWidth={1} />
				{swedenPins.map((pin) => {
				const pos = projection([pin.lng, pin.lat]);
				if (!pos) return null;
				const lifetime = (new Date(pin.expiresAt).getTime() - new Date(pin.scannedAt).getTime()) / 1000;
				const elapsed = Math.max(0, (Date.now() - new Date(pin.scannedAt).getTime()) / 1000);
				return (
					<g key={pin.tagId} style={{ animation: `pin-fade ${lifetime}s linear forwards`, animationDelay: `-${elapsed}s` }}>
						<circle cx={pos[0]} cy={pos[1]} r={4} fill="#f59e0b" />
					</g>
				);
			})}
		</svg>
	);
}
