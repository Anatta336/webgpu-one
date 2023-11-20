struct Vertex {
    position: vec4<f32>,
};

@group(0) @binding(0) var<storage, read> voxels: array<u32>;
@group(0) @binding(1) var<storage, read_write> counter: atomic<u32>;
@group(0) @binding(2) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(3) var<storage, read_write> indices: array<u32>;

// Will process chunks of 64 voxels at a time.
@compute @workgroup_size(4, 4, 4)
fn main(@builtin(global_invocation_id) global_id: vec3u) {

    var voxelPosition: vec3<u32> = global_id.xyz;
    if (!isSolid(voxelPosition)) {
        // Not solid so skip.
        return;
    }

    if (!isSolid(voxelPosition + vec3<u32>(1u, 0u, 0u))) {
        addFaceXPos(voxelPosition, atomicAdd(&counter, 1u));
    }
    if (!isSolid(voxelPosition - vec3<u32>(1u, 0u, 0u))) {
        addFaceXNeg(voxelPosition, atomicAdd(&counter, 1u));
    }
    if (!isSolid(voxelPosition + vec3<u32>(0u, 1u, 0u))) {
        addFaceYPos(voxelPosition, atomicAdd(&counter, 1u));
    }
    if (!isSolid(voxelPosition - vec3<u32>(0u, 1u, 0u))) {
        addFaceYNeg(voxelPosition, atomicAdd(&counter, 1u));
    }
    if (!isSolid(voxelPosition + vec3<u32>(0u, 0u, 1u))) {
        addFaceZPos(voxelPosition, atomicAdd(&counter, 1u));
    }
    if (!isSolid(voxelPosition - vec3<u32>(0u, 0u, 1u))) {
        addFaceZNeg(voxelPosition, atomicAdd(&counter, 1u));
    }
}

fn isSolid(voxelPosition: vec3<u32>) -> bool {
    var voxelLimit = vec3<u32>(voxels[0], voxels[1], voxels[2]);

    if (any(voxelPosition >= voxelLimit)) {
        // Out of bounds, which is considered empty.
        return false;
    }

    // +3 to skip the voxel limits at the start.
    var voxelIndex: u32 = 3u
        + voxelPosition.x
        + voxelPosition.y * voxelLimit.x
        + voxelPosition.z * voxelLimit.x * voxelLimit.y;

    var voxel: u32 = voxels[voxelIndex];

    return voxel != 0u;
}

fn addFaceXPos(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
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
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );

    addFaceIndices(quadIndex);
}

fn addFaceXNeg(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 2u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 3u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );

    addFaceIndices(quadIndex);
}

fn addFaceYPos(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
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

    addFaceIndices(quadIndex);
}

fn addFaceYNeg(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 2u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 3u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );

    addFaceIndices(quadIndex);
}

fn addFaceZPos(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 2u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 3u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) + 0.5,
        f32(1.0)
    );

    addFaceIndices(quadIndex);
}

fn addFaceZNeg(voxelPosition: vec3<u32>, quadIndex: u32) {
    vertices[quadIndex * 4u + 0u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 1u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) - 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 2u].position = vec4<f32>(
        f32(voxelPosition.x) + 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );
    vertices[quadIndex * 4u + 3u].position = vec4<f32>(
        f32(voxelPosition.x) - 0.5,
        f32(voxelPosition.y) + 0.5,
        f32(voxelPosition.z) - 0.5,
        f32(1.0)
    );

    addFaceIndices(quadIndex);
}

fn addFaceIndices(quadIndex: u32) {
    indices[quadIndex * 6u + 0u] = quadIndex * 4u + 0u;
    indices[quadIndex * 6u + 1u] = quadIndex * 4u + 1u;
    indices[quadIndex * 6u + 2u] = quadIndex * 4u + 2u;

    indices[quadIndex * 6u + 3u] = quadIndex * 4u + 0u;
    indices[quadIndex * 6u + 4u] = quadIndex * 4u + 2u;
    indices[quadIndex * 6u + 5u] = quadIndex * 4u + 3u;
}
