// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { App } from "obsidian";

declare module "obsidian" {
	interface Canvas {
		createFileNode: (...args: unknown[]) => FileNode;
	}

	interface CanvasLeaf extends WorkspaceLeaf {
		view: CanvasView;
	}

	interface CanvasView extends View {
		canvas: Canvas;
	}

	interface FileNode {
		constructor: FileNodeConstructor;
	}

	interface FileNodeConstructor {
		prototype: (...args: unknown[]) => unknown;
	}
}
