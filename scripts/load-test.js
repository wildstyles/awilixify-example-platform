import { check, sleep } from "k6";
import http from "k6/http";

const apiUrl = (__ENV.API_URL || "https://api.awilixify.site").replace(
	/\/$/,
	"",
);
// The reservation endpoint requires an existing order. This order is seeded by
// every Orders API process and can be overridden for another environment.
const orderId = __ENV.ORDER_ID || "order-1001";

export const options = {
	discardResponseBodies: true,
	duration: __ENV.DURATION || "1m",
	thresholds: {
		http_req_duration: ["p(95)<2000"],
		http_req_failed: ["rate<0.01"],
	},
	vus: Number(__ENV.VUS || 10),
};

export default function () {
	const response = http.post(
		`${apiUrl}/orders/${orderId}/inventory-reservations`,
		JSON.stringify({
			lines: [{ quantity: 2, sku: "coffee-beans" }],
		}),
		{
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			tags: { endpoint: "queue-inventory-reservation" },
		},
	);

	check(response, {
		"reservation was queued": ({ status }) => status === 200,
	});

	// Keep the default rate useful but safe for the small learning cluster.
	sleep(0.5);
}
