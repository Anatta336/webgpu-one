import Renderer from "./renderer";

export default class CanvasSizer {
    container: HTMLElement;
    canvas: HTMLCanvasElement;
    renderer: Renderer;
    resizeObserver: ResizeObserver;

    constructor(canvas: HTMLCanvasElement, container: HTMLElement, renderer: Renderer) {
        this.canvas = canvas;
        this.container = container;
        this.renderer = renderer;
    }

    start() {
        this.initialResize();

        this.resizeObserver = new ResizeObserver(this.handleResize.bind(this));
        this.resizeObserver.observe(this.container);
    }

    dispose() {
        this.resizeObserver.unobserve(this.container);
    }

    protected handleResize(entries: ResizeObserverEntry[]) {
        entries.forEach((entry) => {
            if (entry.target != this.container) {
                // Nothing to do.
                return;
            }
            const { width, height } = entry.contentRect;

            this.canvas.width = width * window.devicePixelRatio;
            this.canvas.height = height * window.devicePixelRatio;

            this.renderer?.resizeBackings();
        });
    }

    protected initialResize() {
        this.canvas.width = this.container.clientWidth * window.devicePixelRatio;
        this.canvas.height = this.container.clientHeight * window.devicePixelRatio;
    }
}