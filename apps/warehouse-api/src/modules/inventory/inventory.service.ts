import type {
	ReservationLine,
	StockItem,
} from "../../domain/warehouse.types.js";

export class InventoryService {
	private readonly stock = new Map<string, StockItem>([
		[
			"coffee-beans",
			{ availableQuantity: 500, reservedQuantity: 0, sku: "coffee-beans" },
		],
		[
			"ceramic-mug",
			{ availableQuantity: 204, reservedQuantity: 2, sku: "ceramic-mug" },
		],
		[
			"paper-filters",
			{ availableQuantity: 800, reservedQuantity: 5, sku: "paper-filters" },
		],
	]);

	getStock(sku: string): StockItem {
		const item = this.stock.get(sku);
		if (!item) {
			throw new Error(`Stock item ${sku} was not found`);
		}

		return item;
	}

	reserve(lines: ReservationLine[]): void {
		for (const line of lines) {
			const item = this.getStock(line.sku);
			if (item.availableQuantity < line.quantity) {
				throw new Error(`Insufficient stock for ${line.sku}`);
			}
		}

		for (const line of lines) {
			const item = this.getStock(line.sku);
			item.availableQuantity -= line.quantity;
			item.reservedQuantity += line.quantity;
		}
	}
}
