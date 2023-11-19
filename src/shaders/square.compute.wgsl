struct Vertex {
    position: vec4<f32>,
};

@group(0) @binding(0) var<storage, read> voxels: array<u32>;
@group(0) @binding(1) var<storage, read_write> counter: atomic<u32>;
@group(0) @binding(2) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(3) var<storage, read_write> indices: array<u32>;

@compute @workgroup_size(3, 3)
fn main(@builtin(global_invocation_id) global_id: vec3u) {

    // e.g. (3, 3, 1) for a single layer of 9 voxels in all.
    var voxelLimit = vec3<u32>(voxels[0], voxels[1], voxels[2]);

    if (any(global_id >= voxelLimit)) {
        // Out of bounds.
        return;
    }

    var voxelPosition: vec3<u32> = global_id.xyz;
    var voxelIndex: u32 = voxelPosition.x
        + voxelPosition.y * voxelLimit.x
        + voxelPosition.z * voxelLimit.x * voxelLimit.y;

    // +3 to skip the voxel limits at the start.
    var voxel: u32 = voxels[voxelIndex + 3u];

    if (voxel == 0u) {
        // Nothing here, so skip.
        return;
    }

    var quadIndex: u32 = atomicAdd(&counter, 1u);

    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 2u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 3u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );

    indices[quadIndex * 6u + 0u] = quadIndex * 4u + 0u;
    indices[quadIndex * 6u + 1u] = quadIndex * 4u + 1u;
    indices[quadIndex * 6u + 2u] = quadIndex * 4u + 2u;

    indices[quadIndex * 6u + 3u] = quadIndex * 4u + 0u;
    indices[quadIndex * 6u + 4u] = quadIndex * 4u + 2u;
    indices[quadIndex * 6u + 5u] = quadIndex * 4u + 3u;
}