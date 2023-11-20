struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f,
};

struct Uniforms {
    modelViewProjectionMatrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(@location(0) inPositionWorld: vec4f) -> VSOut {
    var positionWorld = vec4f(inPositionWorld.xyz, 1.0);

    var vsOut: VSOut;
    // vsOut.Position = vec4f(positionWorld.xyz * 0.2, 1.0);
    vsOut.Position = uniforms.modelViewProjectionMatrix * positionWorld;

    vsOut.color = vec3f(0.7, 0.3, 0.5);
    return vsOut;
}
