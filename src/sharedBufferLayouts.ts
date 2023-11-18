export const positionAttribDesc: GPUVertexAttribute = {
    shaderLocation: 0, // [[location(0)]]
    offset: 0,
    format: 'float32x3'
};
export const colorAttribDesc: GPUVertexAttribute = {
    shaderLocation: 1, // [[location(1)]]
    offset: 0,
    format: 'float32x3'
};
export const positionBufferDesc: GPUVertexBufferLayout = {
    attributes: [positionAttribDesc],
    arrayStride: 4 * 3, // sizeof(float) * 3
    stepMode: 'vertex'
};
export const colorBufferDesc: GPUVertexBufferLayout = {
    attributes: [colorAttribDesc],
    arrayStride: 4 * 3, // sizeof(float) * 3
    stepMode: 'vertex'
};