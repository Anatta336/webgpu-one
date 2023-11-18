@group(0) @binding(0) var<storage, read> inValues: array<i32>;
@group(0) @binding(1) var<storage, read_write> outValues: array<i32>;

@compute @workgroup_size(3, 3)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
    // TODO: provide size information rather than hardcoding.
    if (global_id.x >= 3 || global_id.y >= 3 || global_id.z >= 1) {
        // Out of bounds.
        return;
    }

    var inValue: i32 = inValues[global_id.x + global_id.y * 3];

    outValues[global_id.x + global_id.y * 3] = (1 - inValue);
}