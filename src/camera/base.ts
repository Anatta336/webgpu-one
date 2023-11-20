import { Mat4, Vec3, Vec4, mat4, vec3 } from 'wgpu-matrix';
import Input from '../input';

// Based on https://webgpu.github.io/webgpu-samples/samples/cameras

export default interface Camera {
    // updates the camera using the user-input and returns the view matrix.
    update(delta_time: number, input: Input): Mat4;

    /**
     * The camera matrix. Inverse of the view matrix.
     */
    matrix: Mat4;
    /**
     * Alias to column vector 0 of the camera matrix.
     */
    right: Vec4;
    /**
     * Alias to column vector 1 of the camera matrix.
     */
    up: Vec4;
    /**
     * Alias to column vector 2 of the camera matrix.
     */
    back: Vec4;
    /**
     * Alias to column vector 3 of the camera matrix.
     */
    position: Vec4;

    setAspectFromDimensions(width: number, height: number): void;
    getModelViewProjectionMatrixAsFloat32Array(): Float32Array;
}

// The common functionality between camera implementations
export class CameraBase {
    // The camera matrix
    private matrix_ = new Float32Array([
        1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
    ]);

    // The calculated view matrix
    private readonly view_ = mat4.identity();

    // Aliases to column vectors of the matrix
    private right_ = new Float32Array(this.matrix_.buffer, 4 * 0, 4);
    private up_ = new Float32Array(this.matrix_.buffer, 4 * 4, 4);
    private back_ = new Float32Array(this.matrix_.buffer, 4 * 8, 4);
    private position_ = new Float32Array(this.matrix_.buffer, 4 * 12, 4);

    protected projectionMatrix: Mat4 = mat4.perspective(Math.PI / 2, 1, 0.1, 100);
    protected modelViewProjectionMatrix: Mat4 = mat4.identity();

    protected fov: number;
    protected aspect: number;
    protected zNear: number;
    protected zFar: number;

    constructor(options?: {
        fov?: number,
        aspect?: number,
        zNear?: number,
        zFar?: number,
    }) {
        this.fov    = options?.fov    ?? (Math.PI * 0.4);
        this.aspect = options?.aspect ?? 1;
        this.zNear  = options?.zNear  ?? 0.1;
        this.zFar   = options?.zFar   ?? 100;

        this.updatePerspective();
    }

    setAspectFromDimensions(width: number, height: number): void {
        this.aspect = height ? (width / height) : 1;
        this.updatePerspective();
    }

    updatePerspective(): void {
        this.projectionMatrix = mat4.perspective(
            this.fov,
            this.aspect,
            this.zNear,
            this.zFar,
            this.projectionMatrix
        );
    }

    getModelViewProjectionMatrixAsFloat32Array(): Float32Array {

        mat4.multiply(this.projectionMatrix, this.view, this.modelViewProjectionMatrix);

        return this.modelViewProjectionMatrix as Float32Array;
    }

    /**
     * The camera matrix.
     */
    get matrix() {
        return this.matrix_;
    }
    /**
     * Assigns `mat` to the camera matrix
     */
    set matrix(mat: Mat4) {
        mat4.copy(mat, this.matrix_);
    }

    /**
     * Returns the camera view matrix
     */
    get view() {
        return this.view_;
    }
    /**
     * Assigns `mat` to the camera view
     */
    set view(mat: Mat4) {
        mat4.copy(mat, this.view_);
    }

    /**
     * Returns column vector 0 of the camera matrix
     */
    get right() {
        return this.right_;
    }
    /**
     * Assigns `vec` to the first 3 elements of column vector 0 of the camera matrix
     */
    set right(vec: Vec3) {
        vec3.copy(vec, this.right_);
    }

    /**
     * Returns column vector 1 of the camera matrix.
     */
    get up() {
        return this.up_;
    }
    /**
     * Assigns `vec` to be the "up" vector of the camera matrix.
     * Doesn't do anything to normalize etc.
     */
    set up(vec: Vec3) {
        vec3.copy(vec, this.up_);
    }

    /**
     * Returns column vector 2 of the camera matrix.
     */
    get back() {
        return this.back_;
    }
    /**
     * Assigns `vec` to be the "back" vector of the camera matrix.
     * Doesn't do anything to normalize etc.
     */
    set back(vec: Vec3) {
        vec3.copy(vec, this.back_);
    }

    /**
     * Returns column vector 3 of the camera matrix.
     */
    get position() {
        return this.position_;
    }
    /**
     * Assigns `vec` to be the "position" vectory of the camera matrix.
     */
    set position(vec: Vec3) {
        vec3.copy(vec, this.position_);
    }
}
