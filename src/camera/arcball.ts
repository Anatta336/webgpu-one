
import { Mat4, Vec3, mat4, vec3 } from 'wgpu-matrix';
import { rotate } from '../mathsHelpers';
import Camera, { CameraBase } from './base';
import Input from '../input';

// Based on https://webgpu.github.io/webgpu-samples/samples/cameras

// ArcballCamera implements a basic orbiting camera around the world origin
export class ArcballCamera extends CameraBase implements Camera {
    /**
     * The camera distance from the target.
     */
    private distance = 0;

    /**
     * The current angular velocity.
     */
    private angularVelocity = 0;

    /**
     * The current rotation axis.
     */
    private axis_ = vec3.create();

    /**
     * The rotation axis.
     */
    get axis() {
        return this.axis_;
    }
    /**
     * Assigns `vec` to the rotation axis.
     */
    set axis(vec: Vec3) {
        vec3.copy(vec, this.axis_);
    }

    /**
     * Speed multiplier for camera rotation.
     */
    rotationSpeed = 1;

    /**
     * Speed multiplier for camera zoom.
     */
    zoomSpeed = 0.1;

    /**
     * Rotation velocity drag coeffient [0 .. 1]
     * 0: Spins forever
     * 1: Instantly stops spinning
     */
    frictionCoefficient = 0.999;

    /**
     * Default to position of (0,0,-5).
     * @param options Optional options, can give initial `position`.
     */
    constructor(options?: {
        position?: Vec3,
        fov?: number,
        aspect?: number,
        zNear?: number,
        zFar?: number,
    }) {
        super(options);

        this.position = options?.position ?? vec3.create(0, 0, -5);
        this.distance = vec3.len(this.position);
        this.back = vec3.normalize(this.position);
        this.recalcuateRight();
        this.recalcuateUp();
    }

    /**
     * Returns the camera matrix
     */
    get matrix() {
        return super.matrix;
    }

    /**
     * Assigns `mat` to the camera matrix, and recalcuates the distance
     */
    set matrix(mat: Mat4) {
        super.matrix = mat;
        this.distance = vec3.len(this.position);
    }

    /**
     * Update state of the camera.
     * @param deltaTime Time in seconds since last update.
     * @param input State of input.
     * @returns New view matrix.
     */
    update(deltaTime: number, input: Input): Mat4 {
        const epsilon = 0.0000001;

        if (input.analog.touching) {
            // Currently being dragged.
            this.angularVelocity = 0;
        } else {
            // Dampen any existing angular velocity
            this.angularVelocity *= Math.pow(1 - this.frictionCoefficient, deltaTime);
        }

        // Calculate the movement vector
        const movement = vec3.create();
        vec3.addScaled(movement, this.right, input.analog.x, movement);
        vec3.addScaled(movement, this.up, -input.analog.y, movement);

        // Cross the movement vector with the view direction to calculate the rotation axis x magnitude
        const crossProduct = vec3.cross(movement, this.back);

        // Calculate the magnitude of the drag
        const magnitude = vec3.len(crossProduct);

        if (magnitude > epsilon) {
            // Normalize the crossProduct to get the rotation axis
            this.axis = vec3.scale(crossProduct, 1 / magnitude);

            // Remember the current angular velocity. This is used when the touch is released for a fling.
            this.angularVelocity = magnitude * this.rotationSpeed;
        }

        // The rotation around this.axis to apply to the camera matrix this update
        const rotationAngle = this.angularVelocity * deltaTime;
        if (rotationAngle > epsilon) {
            // Rotate the matrix around axis
            // Note: The rotation is not done as a matrix-matrix multiply as the repeated multiplications
            // will quickly introduce substantial error into the matrix.
            this.back = vec3.normalize(rotate(this.back, this.axis, rotationAngle));
            this.recalcuateRight();
            this.recalcuateUp();
        }

        // recalculate `this.position` from `this.back` considering zoom
        if (input.analog.zoom !== 0) {
            this.distance *= 1 + input.analog.zoom * this.zoomSpeed;
        }
        this.position = vec3.scale(this.back, this.distance);

        // Invert the camera matrix to build the view matrix
        this.view = mat4.invert(this.matrix);
        return this.view;
    }

    // Assigns `this.right` with the cross product of `this.up` and `this.back`
    recalcuateRight() {
        this.right = vec3.normalize(vec3.cross(this.up, this.back));
    }

    // Assigns `this.up` with the cross product of `this.back` and `this.right`
    recalcuateUp() {
        this.up = vec3.normalize(vec3.cross(this.back, this.right));
    }
}
