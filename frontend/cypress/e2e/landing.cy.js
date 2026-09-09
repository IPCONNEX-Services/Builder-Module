describe("Builder Landing", () => {
	before(() => {
		cy.login();
	});
	it("Open builder page", () => {
		cy.visit("builder/home");
		cy.contains("My Pages").should("be.visible");
		cy.contains("button", "New").should("be.visible");
	});
});
