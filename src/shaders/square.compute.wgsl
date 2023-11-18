@group(0) @binding(0) var<storage, read> inValues: array<u32>;
@group(0) @binding(1) var<storage, read_write> outValues: array<u32>;
@group(0) @binding(2) var<storage, read_write> nextIndex: atomic<u32>;

@compute @workgroup_size(3, 3)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    // TODO: provide size information rather than hardcoding.
    if (global_id.x >= 3 || global_id.y >= 3 || global_id.z >= 1) {
        // Out of bounds.
        return;
    }

    var inputIndex: u32 = global_id.x + global_id.y * 3;
    var inValue: u32 = inValues[inputIndex];

    if (inValue == 0) {
        // Skip.
        return;
    }

    var indexToWriteTo: u32 = atomicAdd(&nextIndex, 1);
    outValues[indexToWriteTo] = inputIndex;
}