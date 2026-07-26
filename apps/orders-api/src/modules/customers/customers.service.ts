export class CustomersService {
	private readonly customers = new Map([
		[
			"customer-001",
			{
				email: "alex@example.com",
				id: "customer-001",
				name: "Alex Morgan",
			},
		],
		[
			"customer-002",
			{
				email: "sam@example.com",
				id: "customer-002",
				name: "Sam Rivera",
			},
		],
	]);

	getCustomer(customerId: string) {
		const customer = this.customers.get(customerId);
		if (!customer) {
			throw new Error(`Customer ${customerId} was not found`);
		}

		return customer;
	}
}
