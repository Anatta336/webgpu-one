import { createBufferFromArray } from "./bufferHelpers";
import computeShaderCode from './shaders/square.compute.wgsl';

const dummyInput = new Uint32Array([
    // First 3 values are dimensions.
    4, 4, 4,

    // Then the actual voxel data. Starting from the bottom layer.
    0, 1, 1, 0,
    1, 1, 0, 0,
    0, 1, 0, 0,
    0, 0, 0, 0,

    0, 0, 0, 0,
    0, 1, 0, 0,
    0, 1, 1, 0,
    0, 0, 0, 0,

    0, 0, 0, 0,
    0, 0, 0, 1,
    0, 1, 0, 0,
    0, 0, 0, 0,

    0, 1, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 0, 0, 0,
]);

export default class SquareGenerator {

    device: GPUDevice;
    queue: GPUQueue;

    readonly maxQuadCount: number;
    readonly maxVertexCount: number;
    readonly maxIndexCount: number;

    highestIndex: number = 0;

    // 3 floats for position.
    bytesPerVertex: number = 4 * 3;

    indicesPerQuad: number = 6;

    /**
     * Voxel buffer to be mapped and written to by CPU.
     * Each voxel is a u32 value.
     */
    mappedVoxelBuffer: GPUBuffer;
    /**
     * Each voxel is a u32 value.
     */
    voxelBuffer: GPUBuffer;
    /**
     * Atomic counters.
     * Actually just one value: index of quad.
     */
    counterBuffer: GPUBuffer;
    /**
     * Buffer of vertex data. Currently just vec3 for position.
     */
    vertexBuffer: GPUBuffer;
    /**
     * Buffer of index data.
     */
    indexBuffer: GPUBuffer;
    /**
     * Mapped version of counterBuffer to read from after completing operation.
     */
    mappedCounterBuffer: GPUBuffer;
    /**
     * Buffer of vertex data, mapped to CPU for debug use.
     */
    mappedVertexBuffer: GPUBuffer;
    /**
     * Buffer of index data, mapped to CPU for debug use.
     */
    mappedIndexBuffer: GPUBuffer;

    constructor(
        device: GPUDevice,
        queue: GPUQueue,
    ) {
        this.device = device;
        this.queue = queue;

        // TODO: check limits for max count.
        // TODO: more significantly, handle needing to go over the max.
        this.maxQuadCount = 1024;
        this.maxVertexCount = this.maxQuadCount * 4; // 4 vertices for each quad.
        this.maxIndexCount = this.maxQuadCount * 6; // 2 triangles for each quad.
    }

    async start(): Promise<GeneratorResult> {
        await this.initializeResources();
        await this.performCompute();

        return {
            vertexBuffer: this.vertexBuffer,
            indexBuffer: this.indexBuffer,
            indexCount: this.highestIndex,
        };
    }

    async initializeResources() {

        this.mappedVoxelBuffer = createBufferFromArray(
            this.device,
            dummyInput,
            // Going to write to this buffer from the CPU, and copy it to another buffer.
            GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC
        );

        this.voxelBuffer = this.device.createBuffer({
            size: this.mappedVoxelBuffer.size,
            // Read from this on the shader, and copy from another buffer.
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        });

        this.counterBuffer = this.device.createBuffer({
            // 4 bytes for single u32 value.
            size: 4 * 2,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
        // Initialise counters to 0.
        new Uint32Array(this.counterBuffer.getMappedRange()).set([0, 0]);
        this.counterBuffer.unmap();

        this.mappedCounterBuffer = this.device.createBuffer({
            size: this.counterBuffer.size,
            // Going to copy the counterBuffer to this one, and read from it on the CPU.
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        this.indexBuffer = this.device.createBuffer({
            // Although we don't need all 4 bytes, WGSL cannot read u16.
            size: 4 * this.maxVertexCount,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        this.vertexBuffer = this.device.createBuffer({
            size: this.maxVertexCount * this.bytesPerVertex,
            // Going to write to on the shader, and copy to another buffer.
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        });

        // -- These buffers exist for debugging --
        this.mappedVertexBuffer = this.device.createBuffer({
            size: this.vertexBuffer.size,
            // Going to copy a buffer to this one, and read from it on the CPU.
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });

        this.mappedIndexBuffer = this.device.createBuffer({
            size: this.indexBuffer.size,
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
                {
                    binding: 0,
                    resource: {
                        buffer: this.voxelBuffer,
                    },
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.counterBuffer,
                    },
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.vertexBuffer,
                    },
                },
                {
                    binding: 3,
                    resource: {
                        buffer: this.indexBuffer,
                    },
                },
            ],
        });

        const commandEncoder = this.device.createCommandEncoder();

        // Copy from writeBuffer to inputBuffer.
        commandEncoder.copyBufferToBuffer(
            this.mappedVoxelBuffer, 0,
            this.voxelBuffer, 0,
            this.mappedVoxelBuffer.size
        );

        // Set up the compute pass, which will read from inputBuffer and write to outputBuffer.
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(computePipeline);
        pass.setBindGroup(0, bindGroup);

        // Single workgroup, which is defined on the shader as 3x3.
        pass.dispatchWorkgroups(1, 1);
        pass.end();

        // Copy counter buffer to a mappable buffer.
        commandEncoder.copyBufferToBuffer(
            this.counterBuffer, 0,
            this.mappedCounterBuffer, 0,
            this.counterBuffer.size
        );

        /*
        // -- debug --
        // Copy to mappable buffers for debugging.
        commandEncoder.copyBufferToBuffer(
            this.vertexBuffer, 0,
            this.mappedVertexBuffer, 0,
            this.vertexBuffer.size
        );
        commandEncoder.copyBufferToBuffer(
            this.indexBuffer, 0,
            this.mappedIndexBuffer, 0,
            this.indexBuffer.size
        );
        // -- /debug --
        */

        // Submit commands.
        const commands = commandEncoder.finish();
        this.queue.submit([commands]);

        await this.mappedCounterBuffer.mapAsync(GPUMapMode.READ);
        this.highestIndex = new Uint32Array(this.mappedCounterBuffer.getMappedRange())[0] * 6;

        /*
        // Request read access to the output buffer, and wait to get it.
        await this.mappedVertexBuffer.mapAsync(GPUMapMode.READ);
        await this.mappedIndexBuffer.mapAsync(GPUMapMode.READ);

        console.log('after compute.',
            new Float32Array(this.mappedVertexBuffer.getMappedRange()),
            new Uint32Array(this.mappedIndexBuffer.getMappedRange())
        );
        */
    }
}

export type GeneratorResult = {
    vertexBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    indexCount: number;
};