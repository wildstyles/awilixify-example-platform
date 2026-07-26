export type StockItem = {
	availableQuantity: number;
	reservedQuantity: number;
	sku: string;
};

export type ReservationLine = {
	quantity: number;
	sku: string;
};

export type Reservation = {
	id: string;
	lines: ReservationLine[];
	orderId: string;
	status: "reserved";
};

export type PickList = {
	id: string;
	reservationId: string;
	status: "ready";
};

export type Shipment = {
	address: string;
	id: string;
	orderId: string;
	pickListId: string;
	status: "label-created";
};
