struct VSOut {
    @builtin(position) Position: vec4f,
    @location(0) color: vec3f,
};

@vertex
fn main(@location(0) inPos: vec4f) -> VSOut {
    var vsOut: VSOut;
    vsOut.Position = vec4f(inPos.xyz * 0.2, 1.0);
    vsOut.color = vec3f(0.7, 0.3, 0.5);
    return vsOut;
}
