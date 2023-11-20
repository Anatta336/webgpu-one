# WebGPU Experiments
Heavily indebted to https://github.com/alaingalvan/webgpu-seed

## Local
```
docker run -u 1000 --rm -it \
  --entrypoint /bin/bash \
  -v "$(pwd)":/app -w /app \
  node:20.9.0
npm i
npm run watch
```
```
docker-compose up -d
```

WebGPU needs a secure context. `localhost` is treated as secure (even though it's not over HTTPS). From `chrome://flags/` you can add other domains to "Insecure origins treated as secure".

## Notes

### Adapter
`navigator.gpu.requestAdapter()` gives a `GPUAdapter` that has `.features` and `.limits`. In theory this can give one of multiple adapters. Haven't tested how that works yet.

### Pipeline
- One per pass.
- Describe:
    - Shaders I'm running.
    - What kind of data goes in.

### Queue
- Can chain pipelines end-to-end within a queue.
- e.g. compute shader(s) pipeline in one pipeline which feeds a vertex buffer to vertex shader in another pipeline.
- Currently there's always just one queue. Maybe in future of multithreading.

### Resources
- Uniforms, attributes, and textures are assigned numbers in the shader and addressed by that number rather than by name.

### Bind Group
Bind group layout defines the input/output interface expected by a shader.

Bind group represents the actual input/output data for a shader.

## Excution timing
`GPUCommandEncoder` (from `device.createCommandEncoder()`) builds batch of buffered commands which will be sent to the GPU for async excution.

`GPUBuffer` methods are not buffered, and get executed atomically when called.

## Axes
- X axis is right.
- Y axis is down in framebuffer, viewport, fragment coordinates. Up in clip space.
- Z axis is away from the screen (0 is near)

## References
- https://www.w3.org/TR/webgpu/
- https://www.w3.org/TR/WGSL/
- https://github.com/greggman/wgpu-matrix
- https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- https://cohost.org/mcc/post/1406157-i-want-to-talk-about
- https://alain.xyz/blog/raw-webgpu
- https://webgpu.github.io/webgpu-samples
- https://developer.chrome.com/blog/from-webgl-to-webgpu/
- https://toji.dev/webgpu-best-practices/compute-vertex-data.html
- https://github.com/greggman/webgpu-utils

## TODO
- [x] Compute generate squares in vertex and index buffer.
- [x] Static perspective camera.
- [x] Fly camera.
- [x] Simple cubes.
- [ ] Fix camera orientation.
- [ ] Large volume.
- [ ] Nicer rendering.
- [ ] Voxel generation via compute.
- [ ] Editing, via compute.

## Ideas
- Rather than flat cube faces, per-block meshes? Sounds like hard work. Textures though.

- Something with LoD at long range. Imposters could be good.

- Interaction with voxel data could be via compute shader, or just like:
```
device.queue.writeBuffer(
    voxelBuffer,
    31 * 4,
    new Uint8Array([1]).buffer
);
```
Expect it's faster to do it via Compute? Strongly suspect don't want to be copying entire buffers back and forth between CPU and GPU.
