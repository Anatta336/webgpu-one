import vertShaderCode from './shaders/triangle.vert.wgsl';
import fragShaderCode from './shaders/triangle.frag.wgsl';
import { positionAttribDesc } from './sharedBufferLayouts';
import Observer, { SimpleCallback } from './observer';
import Camera from './camera/base';

const basicSquarePositions = new Float32Array([
     1.0, -1.0,  0.0, 1.0, // bottom right
    -1.0, -1.0,  0.0, 1.0, // bottom left
     0.8,  0.6,  0.0, 1.0, // top right
    -1.0,  1.0,  0.0, 1.0, // top left
]);

const basicSquareColors = new Float32Array([
    1.0, 0.0, 0.0, // red
    0.0, 1.0, 0.0, // green
    0.0, 0.0, 1.0, // blue
    1.0, 0.0, 1.0, // magenta
]);

const basicSquareIndices = new Uint32Array([
    0, 1, 2,
    1, 2, 3,
]);

// TODO: This is not the real max quad count.
const maxQuadCount = 1024;
const maxVertexCount = maxQuadCount * 4;
const maxIndexCount = maxQuadCount * 6;

export default class Renderer {
    canvas: HTMLCanvasElement;
    camera: Camera;

    // To let others know when the renderer has finished init.
    onReady: Observer<SimpleCallback> = new Observer();

    // API Data Structures
    adapter: GPUAdapter;
    device: GPUDevice;
    queue: GPUQueue;

    // Frame Backings
    context: GPUCanvasContext;
    targetColorView: GPUTextureView;
    depthTexture: GPUTexture;
    depthTextureView: GPUTextureView;

    // Resources
    positionBuffer: GPUBuffer;
    indexBuffer: GPUBuffer;
    uniformBuffer: GPUBuffer;

    uniformBindGroup: GPUBindGroup;

    vertModule: GPUShaderModule;
    fragModule: GPUShaderModule;
    pipeline: GPURenderPipeline;

    /**
     * Number of indices to draw. Indices in the buffer beyond this will be ignored.
     */
    indexCount = (3 * 2) * 6;

    constructor(
        canvas: HTMLCanvasElement,
        camera: Camera,
    ) {
        this.canvas = canvas;
        this.camera = camera;
    }

    // Start the rendering engine
    async start() {
        if (await this.initializeAPI()) {
            this.resizeBackings();
            await this.initializeResources();

            this.onReady.notify();
        }
        // TODO: Handle failure by throwing which can be caught in a .catch()?
    }

    // Initialize WebGPU
    async initializeAPI(): Promise<boolean> {
        try {
            // Entry to WebGPU
            const entry: GPU = navigator.gpu;
            if (!entry) {
                console.error('WebGPU is not supported');
                return false;
            }

            // Physical Device Adapter
            this.adapter = await entry.requestAdapter();

            // Logical Device
            this.device = await this.adapter.requestDevice();

            // Queue
            this.queue = this.device.queue;
        } catch (error) {
            console.error(error);
            return false;
        }

        return true;
    }

    // Initialize resources to render something (buffers, shaders, pipeline)
    async initializeResources() {
        // Buffers
        this.positionBuffer = this.device.createBuffer({
            // 4 bytes per component of vec4 for position.
            size: ((maxVertexCount * 4 * 4) + 3) & ~3,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Float32Array(this.positionBuffer.getMappedRange()).set(basicSquarePositions);
        this.positionBuffer.unmap();

        this.indexBuffer = this.device.createBuffer({
            // 4 bytes per index.
            size: ((maxIndexCount * 4) + 3) & ~3,
            usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
            mappedAtCreation: true,
        });
        new Uint32Array(this.indexBuffer.getMappedRange()).set(basicSquareIndices);
        this.indexBuffer.unmap();

        this.indexCount = basicSquareIndices.length;

        // Uniform Buffer
        this.uniformBuffer = this.device.createBuffer({
            size: 4 * 4 * 4, // 4x4 matrix of 4-byte floats.
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
        });

        const uniformBufferBindingLayout: GPUBufferBindingLayout = {
            type: 'uniform',
            hasDynamicOffset: false,
            minBindingSize: 4 * 4 * 4,
        };

        const bindGroupLayout = this.device.createBindGroupLayout({
            entries: [{
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: uniformBufferBindingLayout,
            }],
        });

        this.uniformBindGroup = this.device.createBindGroup({
            layout: bindGroupLayout,
            entries: [{
                binding: 0,
                resource: {
                    buffer: this.uniformBuffer,
                },
            }],
        });

        // Position buffer layout.
        const positionBufferDesc: GPUVertexBufferLayout = {
            attributes: [positionAttribDesc],
            arrayStride: 4 * 4, // 4 bytes per float, 4 floats per vertex.
            stepMode: 'vertex'
        };

        // Crate shader modules, pulling in code from imported files.
        this.vertModule = this.device.createShaderModule({
            code: vertShaderCode
        });

        this.fragModule = this.device.createShaderModule({
            code: fragShaderCode
        });

        // Graphics Pipeline

        // Depth and stencil state.
        const depthStencil: GPUDepthStencilState = {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        };

        // Uniform Data
        const pipelineLayoutDesc: GPUPipelineLayoutDescriptor = {
            bindGroupLayouts: [
                bindGroupLayout,
            ],
        };
        const layout = this.device.createPipelineLayout(pipelineLayoutDesc);

        // Shader Stages
        const vertex: GPUVertexState = {
            module: this.vertModule,
            entryPoint: 'main',
            buffers: [positionBufferDesc]
        };

        // Color/Blend State
        const colorState: GPUColorTargetState = {
            format: 'bgra8unorm'
        };

        const fragment: GPUFragmentState = {
            module: this.fragModule,
            entryPoint: 'main',
            targets: [colorState]
        };

        // Rasterization
        const primitive: GPUPrimitiveState = {
            frontFace: 'cw',
            cullMode: 'none',
            topology: 'triangle-list'
        };

        const pipelineDesc: GPURenderPipelineDescriptor = {
            layout,

            vertex,
            fragment,

            primitive,
            depthStencil
        };
        this.pipeline = this.device.createRenderPipeline(pipelineDesc);
    }

    copyInMeshBuffers(vertexBuffer: GPUBuffer, indexBuffer: GPUBuffer, indexCount: number): void {
        const commandEncoder = this.device.createCommandEncoder();

        commandEncoder.copyBufferToBuffer(
            vertexBuffer, 0,
            this.positionBuffer, 0,
            vertexBuffer.size
        );
        commandEncoder.copyBufferToBuffer(
            indexBuffer, 0,
            this.indexBuffer, 0,
            indexBuffer.size
        );

        this.queue.submit([commandEncoder.finish()]);

        this.queue.onSubmittedWorkDone().then(() => {
            this.indexCount = indexCount;

            console.log('Buffer copy complete.');
        });
    }

    // Resize swapchain, frame buffer attachments, camera aspect.
    resizeBackings() {
        if (!this.device) {
            // Haven't initialized yet.
            return;
        }

        // Swapchain
        if (!this.context) {
            this.context = this.canvas.getContext('webgpu');
            const canvasConfig: GPUCanvasConfiguration = {
                device: this.device,
                format: 'bgra8unorm',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
                alphaMode: 'opaque'
            };
            this.context.configure(canvasConfig);
        }

        const depthTextureDesc: GPUTextureDescriptor = {
            size: [this.canvas.width, this.canvas.height, 1],
            dimension: '2d',
            format: 'depth24plus-stencil8',
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
        };

        this.depthTexture = this.device.createTexture(depthTextureDesc);
        this.depthTextureView = this.depthTexture.createView();

        this.camera?.setAspectFromDimensions(this.canvas.width, this.canvas.height);
    }

    // Write commands to send to the GPU.
    encodeCommands() {
        const colorAttachment: GPURenderPassColorAttachment = {
            // What texture to use as the render target (via a GPUTextureView)
            view: this.targetColorView,

            clearValue: { r: 0, g: 0, b: 0, a: 1 },
            loadOp: 'clear',
            storeOp: 'store'
        };

        const depthAttachment: GPURenderPassDepthStencilAttachment = {
            view: this.depthTextureView,

            depthClearValue: 1,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',

            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store'
        };

        // Define the render pass, which could output to multiple targets.
        const renderPassDesc: GPURenderPassDescriptor = {
            colorAttachments: [colorAttachment],
            depthStencilAttachment: depthAttachment,
        };

        // Write camera's MVP matrix to the uniform buffer.
        const modelViewProjection = this.camera.getModelViewProjectionMatrixAsFloat32Array();

        this.queue.writeBuffer(
            this.uniformBuffer,
            0,
            modelViewProjection.buffer,
            modelViewProjection.byteOffset,
            modelViewProjection.byteLength
        );

        const commandEncoder = this.device.createCommandEncoder();

        // Encode drawing commands
        const passEncoder = commandEncoder.beginRenderPass(renderPassDesc);
        passEncoder.setPipeline(this.pipeline);

        passEncoder.setBindGroup(0, this.uniformBindGroup);

        passEncoder.setViewport(
            0,
            0,
            this.canvas.width,
            this.canvas.height,
            0,
            1
        );
        passEncoder.setScissorRect(
            0,
            0,
            this.canvas.width,
            this.canvas.height
        );
        passEncoder.setVertexBuffer(0, this.positionBuffer);
        passEncoder.setIndexBuffer(this.indexBuffer, 'uint32');
        passEncoder.drawIndexed(this.indexCount, 1);
        passEncoder.end();

        // In this case we only put one command buffer in the queue, but can have many.
        this.queue.submit([commandEncoder.finish()]);
    }

    render = () => {
        // Acquire next image from context, and create a GPUTextureView of it.
        const targetColorTexture = this.context.getCurrentTexture();
        this.targetColorView = targetColorTexture.createView();

        // Do our little pipeline.
        this.encodeCommands();
    };
}
