import type {
	OrderLineInput,
	PricedOrderLine,
} from "../../domain/order.types.js";
import type { Deps } from "./pricing.module.js";

export class PricingService {
	constructor(private readonly catalogService: Deps["catalogService"]) {}

	priceLines(lines: OrderLineInput[]): {
		lines: PricedOrderLine[];
		total: number;
	} {
		const pricedLines = lines.map((line) => {
			const product = this.catalogService.getProduct(line.sku);

			return {
				...line,
				name: product.name,
				unitPrice: product.price,
			};
		});

		return {
			lines: pricedLines,
			total: pricedLines.reduce(
				(total, line) => total + line.unitPrice * line.quantity,
				0,
			),
		};
	}
}
