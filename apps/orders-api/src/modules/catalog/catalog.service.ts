export type Product = {
	name: string;
	price: number;
	sku: string;
};

export class CatalogService {
	private readonly products = new Map<string, Product>([
		[
			"coffee-beans",
			{ name: "House Blend Coffee Beans", price: 18, sku: "coffee-beans" },
		],
		[
			"ceramic-mug",
			{ name: "Stoneware Coffee Mug", price: 12, sku: "ceramic-mug" },
		],
		[
			"paper-filters",
			{ name: "Coffee Filters, 100 pack", price: 7, sku: "paper-filters" },
		],
	]);

	getProduct(sku: string): Product {
		const product = this.products.get(sku);
		if (!product) {
			throw new Error(`Product ${sku} was not found`);
		}

		return product;
	}
}
