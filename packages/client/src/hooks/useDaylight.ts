import * as SunCalc from "suncalc";
import { useEffect, useState } from "react";

const LAT = 55.980142;
const LNG = 14.134707;

function check() {
	const now = new Date();
	const { sunrise, sunset } = SunCalc.getTimes(now, LAT, LNG);
	return now >= sunrise && now <= sunset;
}

export function useDaylight() {
	const [daylight, setDaylight] = useState(check);
	useEffect(() => {
		const timer = setInterval(() => setDaylight(check()), 60_000);
		return () => clearInterval(timer);
	}, []);
	return daylight;
}
