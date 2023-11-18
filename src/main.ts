import Renderer from './renderer';
import CanvasSizer from './canvasSizer';
import SquareGenerator from './squareGenerator';

const container = document.getElementById('gfx-container') as HTMLElement;
const canvas = document.getElementById('gfx') as HTMLCanvasElement;

const renderer = new Renderer(canvas);
renderer.start();

const sizer = new CanvasSizer(canvas, container, renderer);
sizer.start();

const button = document.getElementById('button-generate');
button.addEventListener('click', () => {
    console.log('start generator');

    const generator = new SquareGenerator(renderer.device, renderer.queue);

    generator.start();
});
