describe("Builder page lifecycle", () => {
	let pageName;
	let route;

	before(() => {
		cy.login();
		cy.request("POST", "/api/resource/Builder Page", {
			page_title: "Security regression fixture",
			blocks: JSON.stringify([
				{
					element: "body",
					blockId: "root",
					children: [
						{
							element: "p",
							blockId: "security-text",
							innerHTML: "<p>Original website text</p>",
							baseStyles: { padding: "40px", fontSize: "24px" },
						},
					],
				},
			]),
		}).then(({ body }) => {
			pageName = body.data.name;
			route = body.data.route;
		});
	});

	after(() => {
		if (pageName) cy.request("DELETE", `/api/resource/Builder Page/${pageName}`);
	});

	it("edits, saves, previews, and publishes a page", () => {
		cy.viewport(1440, 1000);
		cy.visit(`/builder/page/${pageName}`);
		cy.get('[data-block-id="security-text"]').filter(":visible").first().dblclick();
		cy.get('.tiptap[contenteditable="true"]').first().type("{selectall}Updated website text{esc}");
		cy.contains("button", /^Publish$/).should("be.enabled");
		cy.window().then((win) => cy.stub(win, "open").as("openPage"));
		cy.contains("button", /^Publish$/).click();
		cy.get("@openPage", { timeout: 20000 }).should("have.been.called");
		cy.request(`/api/resource/Builder Page/${pageName}`).then(({ body }) => {
			expect(body.data.published).to.equal(1);
			expect(body.data.blocks).to.contain("Updated website text");
		});
		cy.reload();
		cy.get('[data-block-id="security-text"]').first().should("contain", "Updated website text");
		cy.get('a[title="Preview"]').click();
		cy.contains("Updated website text").should("be.visible");
		cy.request(`/${route}`).its("body").should("contain", "Updated website text");
	});
});
