import { createBufferFromArray } from "./bufferHelpers";
import computeShaderCode from './shaders/square.compute.wgsl';

const dummyInput = new Uint16Array([
    0, 1, 1,
    1, 1, 0,
    0, 1, 0,
]);
const dummyWidth = 3;
const dummyHeight = 3;

export default class SquareGenerator {

    device: GPUDevice;
    queue: GPUQueue;

    squareCount: number;
    vertexCount: number;
    bytesPerVertex: number;

    inputBuffer: GPUBuffer;
    outputBuffer: GPUBuffer;

    constructor(
        device: GPUDevice,
        queue: GPUQueue,
        bytesPerVertex: number = 4 * 3
        // squareCount: number = 1,
    ) {
        this.device = device;
        this.queue = queue;

        this.bytesPerVertex = bytesPerVertex;
        // this.squareCount = squareCount; // TODO: using dummy for now.

        this.squareCount = dummyWidth * dummyHeight;

        this.vertexCount = this.squareCount * 4;
    }

    async start() {
        await this.initializeResources();
        await this.performCompute();
    }

    async initializeResources() {

        this.inputBuffer = createBufferFromArray(
            this.device,
            dummyInput,
            // Going to write to this buffer from the CPU, and read from it in the shader.
            GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
        );

        // Output buffer to match input, but with different usage.
        this.outputBuffer = this.device.createBuffer({
            size: this.inputBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        /*
        // Buffer to hold vertex data output of compute shader.
        const outputBuffer: GPUBuffer = this.device.createBuffer({
            // Align to 4 bytes.
            size: (this.vertexCount * this.bytesPerVertex + 3) & ~3,

            // Going to write to this buffer from shader, and read from it on the CPU.
            // TODO: when using this for vertices, GPUBufferUsage.VERTEX?
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
        */
    }

    async performCompute() {
        const copyEncoder = this.device.createCommandEncoder();
        copyEncoder.copyBufferToBuffer(
            this.inputBuffer, 0,
            this.outputBuffer, 0,
            this.inputBuffer.size
        );

        // --- really this shouldn't be "initialize"

        // Submit copy command.
        const copyCommands = copyEncoder.finish();
        this.queue.submit([copyCommands]);

        // Request read access to the output buffer, and wait to get it.
        await this.outputBuffer.mapAsync(GPUMapMode.READ);
        const outputArrayBuffer = this.outputBuffer.getMappedRange();

        console.log('from output:', new Uint16Array(outputArrayBuffer));
    }

        /*
        const stage: GPUProgrammableStage = {
            module: this.device.createShaderModule({
                code: computeShaderCode,
            }),
            entryPoint: 'main',
        };

        const pipelineLayoutDesc = { bindGroupLayouts: [] };
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);

        const computePipelineDesc: GPUComputePipelineDescriptor = {
            compute: stage,
            layout: layout,
        };

        // Create a compute pipeline with a compute shader that generates vertex data.
        const computePipeline = this.device.createComputePipeline(computePipelineDesc);
        */
}
