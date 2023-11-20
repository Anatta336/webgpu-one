import Renderer from './renderer';
import CanvasSizer from './canvasSizer';
import SquareGenerator, { GeneratorResult } from './squareGenerator';
import Octavia from './octavia';
import { createInputHandler } from './input';
import WASDCamera from './camera/wasd';
import { vec3 } from 'wgpu-matrix';

const container = document.getElementById('gfx-container') as HTMLElement;
const canvas = document.getElementById('gfx') as HTMLCanvasElement;

const camera = new WASDCamera({
    position: vec3.fromValues(-5, 0, -1),
    target: vec3.fromValues(0, 0, 0),
});

const renderer = new Renderer(canvas, camera);
renderer.start();

const sizer = new CanvasSizer(canvas, container, renderer);
sizer.start();

const inputHandler = createInputHandler(window, canvas);

// Set up game loop, now that all the elements are declared.
let lastFrameTime = Date.now();
renderer.onReady.addCallback(() => {
    lastFrameTime = Date.now();
    requestAnimationFrame(gameLoop);
});

// Warm up the camera.
camera.update(0, inputHandler());

function gameLoop() {
    const now = Date.now();
    const deltatime = (now - lastFrameTime) * 0.001;
    lastFrameTime = now;

    const inputThisFrame = inputHandler();

    camera.update(deltatime, inputThisFrame);

    renderer.render();

    requestAnimationFrame(gameLoop);
}

document.getElementById('button-generate').addEventListener('click', () => {
    const generator = new SquareGenerator(renderer.device, renderer.queue);

    generator.start().then((result: GeneratorResult) => {
        renderer.copyInMeshBuffers(
            result.vertexBuffer,
            result.indexBuffer,
            result.indexCount
        );
    });
});

document.getElementById('button-octavia')?.addEventListener('click', () => {
    const octaviaCanvas = document.getElementById('octavia') as HTMLCanvasElement;

    const octaviaContext = octaviaCanvas?.getContext('2d') as CanvasRenderingContext2D;

    if (!octaviaContext) {
        return;
    }

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
