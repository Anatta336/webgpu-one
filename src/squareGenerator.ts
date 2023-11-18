import { createBufferFromArray } from "./bufferHelpers";
import computeShaderCode from './shaders/square.compute.wgsl';

const dummyInput = new Int32Array([
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

    writeBuffer: GPUBuffer;
    inputBuffer: GPUBuffer; // <- used by shader
    outputBuffer: GPUBuffer; // <- used by shader
    readBuffer: GPUBuffer;

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

        // Buffer to be written to on the CPU.
        this.writeBuffer = createBufferFromArray(
            this.device,
            dummyInput,
            // Going to write to this buffer from the CPU, and copy it to another buffer.
            GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
        );

        this.inputBuffer = this.device.createBuffer({
            size: this.writeBuffer.size,
            // Going copy from another buffer, and read from on the shader.
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.outputBuffer = this.device.createBuffer({
            size: this.inputBuffer.size,
            // Going to write to on the shader, and copy to another buffer.
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        // Buffer to be read on the CPU.
        this.readBuffer = this.device.createBuffer({
            size: this.inputBuffer.size,
            // Going to copy a buffer to this one, and read from it on the CPU.
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    async performCompute() {

        // Create a compute pipeline.
        const computePipeline = this.device.createComputePipeline({
            layout: 'auto',
            compute: {
                module: this.device.createShaderModule({
                    code: computeShaderCode,
                }),
                entryPoint: 'main',
            },
        });

        const bindGroupLayout = computePipeline.getBindGroupLayout(0);

        // Set up data to be passed in and out.
        const bindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [
                { // Input
                    binding: 0,
                    resource: {
                        buffer: this.inputBuffer,
                    },
                },
                { // Output
                    binding: 1,
                    resource: {
                        buffer: this.outputBuffer,
                    },
                },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();

        // Copy from writeBuffer to inputBuffer.
        commandEncoder.copyBufferToBuffer(
            this.writeBuffer, 0,
            this.inputBuffer, 0,
            this.writeBuffer.size
        );

        // Set up the compute pass, which will read from inputBuffer and write to outputBuffer.
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, bindGroup);

        // Single workgroup, which is defined on the shader as 3x3.
        pass.dispatchWorkgroups(1, 1);
        pass.end();

        // Copy from outputBuffer to readBuffer.
        commandEncoder.copyBufferToBuffer(
            this.outputBuffer, 0,
            this.readBuffer, 0,
            this.outputBuffer.size
        );

        // Submit commands.
        const commands = commandEncoder.finish();
        this.queue.submit([commands]);

        // Request read access to the output buffer, and wait to get it.
        await this.readBuffer.mapAsync(GPUMapMode.READ);
        const readBufferContent = this.readBuffer.getMappedRange();

        console.log('after compute:', new Int32Array(readBufferContent));
    }
}
