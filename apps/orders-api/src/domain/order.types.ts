export type OrderLineInput = {
	quantity: number;
	sku: string;
};

export type PricedOrderLine = OrderLineInput & {
	name: string;
	unitPrice: number;
};

export type Order = {
	customerId: string;
	fulfillmentStatus: "pending" | "reserved";
	id: string;
	lines: PricedOrderLine[];
	reservationId?: string;
	status: "placed";
	total: number;
};
