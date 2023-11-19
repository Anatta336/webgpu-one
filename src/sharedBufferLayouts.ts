export const positionAttribDesc: GPUVertexAttribute = {
    shaderLocation: 0, // [[location(0)]]
    offset: 0,
    format: 'float32x4'
};
export const colorAttribDesc: GPUVertexAttribute = {
    shaderLocation: 1, // [[location(1)]]
    offset: 0,
    format: 'float32x3'
};
export const positionBufferDesc: GPUVertexBufferLayout = {
    attributes: [positionAttribDesc],
    arrayStride: 4 * 4, // 4 bytes per float, 4 floats per vertex.
    stepMode: 'vertex'
};