import Renderer from './renderer';
import CanvasSizer from './canvasSizer';
import SquareGenerator from './squareGenerator';
import Octavia from './octavia';

const container = document.getElementById('gfx-container') as HTMLElement;
const canvas = document.getElementById('gfx') as HTMLCanvasElement;

const renderer = new Renderer(canvas);
renderer.start();

const sizer = new CanvasSizer(canvas, container, renderer);
sizer.start();

document.getElementById('button-generate').addEventListener('click', () => {
    const generator = new SquareGenerator(renderer.device, renderer.queue);

    generator.start().then(() => {
        console.log('Generated. Copying to buffers.');
        renderer.copyInMeshBuffers(generator.vertexBuffer, generator.indexBuffer, 5 * 6);
    });
});

document.getElementById('button-octavia').addEventListener('click', () => {
    const octaviaCanvas = document.getElementById('octavia') as HTMLCanvasElement;
    const octaviaContext = octaviaCanvas.getContext('2d') as CanvasRenderingContext2D;

    const octavia = new Octavia(
        octaviaCanvas.width, octaviaCanvas.height, // xSize, ySize
        8, // density
        6, // octaves
        0.4, // amplitudeRatio
        4, // softness
        4, // samples
        0.5, 0.5 // bias, range
    );
    const imageData = octaviaContext.createImageData(octaviaCanvas.width, octaviaCanvas.height);

    for (let x = 0; x < octaviaCanvas.width; x++) {
        for (let y = 0; y < octaviaCanvas.height; y++) {
            const value = octavia.sample(x, y);
            const index = (x + y * octaviaCanvas.width) * 4;

            // Greyscale.
            imageData.data[index + 0] = value * 255;
            imageData.data[index + 1] = value * 255;
            imageData.data[index + 2] = value * 255;
            imageData.data[index + 3] = 255;
        }
    }

    octaviaContext.putImageData(imageData, 0, 0);
});
