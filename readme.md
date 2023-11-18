# WebGPU Experiments
Heavily indebted to https://github.com/alaingalvan/webgpu-seed

## Local
```
docker run -u 1000 --rm -it --entrypoint /bin/bash -v "$(pwd)":/app -w /app node:20.9.0
```

WebGPU needs a secure context. `localhost` is treated as secure (even though it's not over HTTPS). From `chrome://flags/` you can add other domains to "Insecure origins treated as secure".

## Notes

### Adapter
`navigator.gpu.requestAdapter()` gives a `GPUAdapter` that has `.features` and `.limits`. Very useful!

If a device has multiple adapters (most commonly a dedicated and an integrated GPU) how do we pick which to use?

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


## References
- https://www.w3.org/TR/webgpu/
- https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- https://cohost.org/mcc/post/1406157-i-want-to-talk-about
- https://alain.xyz/blog/raw-webgpu
- https://webgpu.github.io/webgpu-samples
