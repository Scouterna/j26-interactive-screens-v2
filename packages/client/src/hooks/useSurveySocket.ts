import { useEffect, useRef, useState } from "react";
import type { DisplayState, ServerWsMessage } from "shared";
import { BASE_PATH } from "../config";

export function useSurveySocket(surveyId: string) {
	const [displayState, setDisplayState] = useState<DisplayState | null>(null);
	const [ended, setEnded] = useState(false);
	const unmountedRef = useRef(false);
	const backoffRef = useRef(1000);

	useEffect(() => {
		unmountedRef.current = false;
		let ws: WebSocket | null = null;

		function connect() {
			if (unmountedRef.current) return;
			const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
			ws = new WebSocket(`${protocol}//${window.location.host}${BASE_PATH}/ws`);
			const currentWs = ws;

			currentWs.onopen = () => {
				backoffRef.current = 1000;
				currentWs.send(JSON.stringify({ type: "subscribe", surveyId }));
			};

			currentWs.onmessage = (event: MessageEvent<string>) => {
				const msg: ServerWsMessage = JSON.parse(event.data) as ServerWsMessage;
				if (msg.surveyId !== surveyId) return;
				if (msg.type === "state" || msg.type === "update") {
					setDisplayState(msg.data);
					setEnded(false);
				} else if (msg.type === "survey_ended") {
					setEnded(true);
				}
			};

			currentWs.onclose = () => {
				if (unmountedRef.current) return;
				const delay = Math.min(backoffRef.current, 30000);
				backoffRef.current = delay * 2;
				setTimeout(connect, delay);
			};
		}

		connect();

		return () => {
			unmountedRef.current = true;
			ws?.close();
		};
	}, [surveyId]);

	return { displayState, ended };
}
