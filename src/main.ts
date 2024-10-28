import { around } from "monkey-around";
import { Plugin, Canvas, FileNodeConstructor, CanvasLeaf } from "obsidian";

export default class CanvasPerformancePatchPlugin extends Plugin {
	name = "Canvas Performance Patch";

	async onload() {
		this.app.workspace.onLayoutReady(() => {
			if (!this.tryPatchFileNode()) {
				const evt = this.app.workspace.on("layout-change", () => {
					this.tryPatchFileNode() && this.app.workspace.offref(evt);
				});
				this.registerEvent(evt);
			}
		});

		this.log("Plugin loaded");
	}

	onunload() {
		this.log("Unloading plugin");
	}

	log(msg: unknown, debug = false) {
		debug
			? console.debug(`[${this.name}]`, msg)
			: console.log(`[${this.name}]`, msg);
	}

	retrieveFileNodeConstructor(canvasInstance: Canvas): FileNodeConstructor {
		// dummy canvas allows calling any method without raising errors
		const dummyCanvasInstance = new Proxy({}, { get: () => () => {} });
		const dummyNodeParams = {
			pos: { x: 0, y: 0 },
			size: { width: 0, height: 0 },
			position: "center",
			file: { path: "" },
			subpath: "",
			save: false,
			focus: false,
		};

		const dummyFileNode = canvasInstance.createFileNode.call(
			dummyCanvasInstance,
			dummyNodeParams
		);
		return dummyFileNode.constructor;
	}

	tryPatchFileNode(): boolean {
		const canvas = (
			this.app.workspace.getLeavesOfType("canvas") as CanvasLeaf[]
		).find((leaf) => leaf?.view?.canvas)?.view?.canvas;
		if (!canvas) return false;

		const fileNodeConstructor = this.retrieveFileNodeConstructor(canvas);
		this.patchFileNode(fileNodeConstructor);
		return true;
	}

	patchFileNode(constructor: FileNodeConstructor): boolean {
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const thisPlugin = this;
		const uninstaller = around(constructor.prototype, {
			updateBreakpoint: (next: (...args: unknown[]) => unknown) =>
				function (...args: unknown[]) {
					// updateBreakpoint tries to call updateBreakpoint of a
					// parent class which is the source of the bug.
					// Here we temporarily replace the parent's
					// updateBreakpoint with a dummy function to prevent this

					const parentPrototype = this.__proto__.__proto__;
					const original = parentPrototype.updateBreakpoint;
					parentPrototype.updateBreakpoint = () => {};
					const result = next.call(this, ...args);
					parentPrototype.updateBreakpoint = original;

					return result;
				},
		});
		this.register(uninstaller);

		thisPlugin.log("Canvas patched successfully");
		return true;
	}
}
