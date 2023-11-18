export function createBufferFromArray(
    device: GPUDevice,
    array: Float32Array | Uint16Array,
    usage: number
) {
    // Create a GPUBuffer.
    const buffer: GPUBuffer = device.createBuffer({
        // Align to 4 bytes.
        size: (array.byteLength + 3) & ~3,
        // See GPUBufferUsageFlags.
        usage,
        mappedAtCreation: true,
    });

    // Write the contents of the array to the GPUBuffer.
    if (array instanceof Uint16Array) {
        new Uint16Array(buffer.getMappedRange()).set(array);
    } else if (array instanceof Float32Array) {
        new Float32Array(buffer.getMappedRange()).set(array);
    } else {
        throw new Error(`Attempt to create buffer for unsupport array: ${typeof array}`);
    }

    // Unmapping means CPU-land releases claim, and the GPU can use it.
    buffer.unmap();

    return buffer;
};