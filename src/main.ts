import Renderer from './renderer';
import CanvasSizer from './canvasSizer';

const container = document.getElementById('gfx-container') as HTMLElement;
const canvas = document.getElementById('gfx') as HTMLCanvasElement;

const renderer = new Renderer(canvas);
renderer.start();

const sizer = new CanvasSizer(canvas, container, renderer);
sizer.start();
