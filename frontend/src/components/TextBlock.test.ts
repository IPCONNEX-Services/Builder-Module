import { mergeAttributes } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp, nextTick, reactive, shallowReactive } from "vue";

const context = vi.hoisted(() => ({ store: null as any }));
vi.mock("@/store", () => ({ default: () => context.store }));
vi.mock("@/utils/blockController", () => ({ default: { multipleBlocksSelected: () => false } }));
vi.mock("@/utils/fontManager", () => ({ setFontFromHTML: vi.fn() }));
vi.mock("@/utils/helpers", () => ({ getDataForKey: (data: any, key: string) => data[key] }));
vi.mock("frappe-ui", () => ({ Input: { template: "<input />" } }));
vi.mock("@/utils/block", () => ({
	default: class Block {
		innerHTML = "<p>Invoice website</p>";
		getTag() {
			return "div";
		}
		getElement() {
			return "p";
		}
		getInnerHTML() {
			return this.innerHTML;
		}
		setInnerHTML(value: string) {
			this.innerHTML = value;
		}
		getDataKey() {
			return undefined;
		}
		isLink() {
			return false;
		}
		isButton() {
			return false;
		}
		isHeader() {
			return false;
		}
		hasChildren() {
			return false;
		}
	},
}));

import Block from "@/utils/block";

describe("TextBlock editor migration", () => {
	let app: ReturnType;
	let block: any;
	let editor: any;

	beforeEach(async () => {
		document.body.innerHTML = '<div id="overlay"></div><div id="test-app"></div>';
		// Import after the overlay exists, as in the Builder canvas.
		const { default: TextBlock } = await import("./TextBlock.vue");
		block = reactive(new (Block as any)());
		context.store = shallowReactive({
			editableBlock: block,
			activeCanvas: { isSelected: () => true, history: { pause: vi.fn(), resume: vi.fn() } },
		});
		app = createApp(TextBlock, { block });
		app.component("FeatherIcon", { template: "<span />" });
		app.component("Button", { template: "<button><slot /></button>" });
		app.provide("canvasProps", reactive({ panning: false, scaling: false }));
		app.mount("#test-app");
		await nextTick();
		editor = block.editor;
	});

	afterEach(() => {
		app?.unmount();
		document.body.innerHTML = "";
	});

	it("mounts the actual component and formats persisted text", async () => {
		expect(document.querySelector(".tiptap")).not.toBeNull();
		editor.chain().selectAll().toggleBold().run();
		await nextTick();
		expect(block.innerHTML).toContain("<strong>Invoice website</strong>");
	});

	it("loads external changes without emitting updates back into canvas history", async () => {
		const update = vi.fn();
		editor.on("update", update);
		block.innerHTML = "<p>Saved elsewhere</p>";
		await nextTick();
		expect(editor.getText()).toBe("Saved elsewhere");
		expect(update).not.toHaveBeenCalled();
	});

	it("keeps one link extension and supports adding and removing safe links", () => {
		expect(editor.extensionManager.extensions.filter((x: any) => x.name === "link")).toHaveLength(1);
		editor.chain().selectAll().setLink({ href: "https://example.com/invoice" }).run();
		expect(block.innerHTML).toContain('href="https://example.com/invoice"');
		editor.chain().selectAll().unsetLink().run();
		expect(block.innerHTML).not.toContain("<a ");
	});

	it("rejects executable link URLs", () => {
		editor.chain().selectAll().setLink({ href: "javascript:alert(1)" }).run();
		expect(editor.getHTML()).not.toContain("javascript:");
	});

	it("retains color and font-family formatting", () => {
		editor.chain().selectAll().setColor("#ff0000").setFontFamily("Arial").run();
		expect(editor.getHTML()).toContain("color:");
		expect(editor.getHTML()).toContain("font-family: Arial");
	});

	it("supports undo after typing", () => {
		editor.chain().selectAll().insertContent("Changed text").run();
		expect(editor.getText()).toBe("Changed text");
		editor.commands.undo();
		expect(editor.getText()).toBe("Invoice website");
	});

	it("destroys its editor when unmounted", () => {
		app.unmount();
		expect(editor.isDestroyed).toBe(true);
		app = undefined as any;
	});
});

it("does not inherit executable DOM attributes from an own __proto__ key", () => {
	const attributes = mergeAttributes(JSON.parse('{"__proto__":{"onclick":"alert(1)"},"class":"safe"}'));
	expect(attributes.onclick).toBeUndefined();
	expect(attributes.class).toBe("safe");
	expect(Object.prototype).not.toHaveProperty("onclick");
});
