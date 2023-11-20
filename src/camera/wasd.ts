
import { Mat4, Vec3, mat4, vec3 } from 'wgpu-matrix';
import { clamp, mod, lerp } from '../mathsHelpers';
import Camera, { CameraBase } from './base';
import Input from '../input';

// Based on https://webgpu.github.io/webgpu-samples/samples/cameras

// WASDCamera is a camera implementation that behaves similar to first-person-shooter PC games.
export default class WASDCamera extends CameraBase implements Camera {
    /**
     * The camera absolute pitch angle.
     */
    private pitch = 0;
    /**
     * The camera absolute yaw angle.
     */
    private yaw = 0;

    /**
     * The current velocity vector.
     */
    private readonly velocity_ = vec3.create();
    /**
     * Speed multiplier for camera movement.
     */
    movementSpeed = 5;

    /**
     * Speed multiplier for camera rotation.
     */
    rotationSpeed = 1;

    /**
     * Movement velocity drag coeffient [0 .. 1]
     * 0: Continues forever
     * 1: Instantly stops moving
     */
    frictionCoefficient = 0.99;

    /**
     * Current velocity vector.
     */
    get velocity() {
        return this.velocity_;
    }
    /**
     * Assigns `vec` to the current velocity vector.
     */
    set velocity(vec: Vec3) {
        vec3.copy(vec, this.velocity_);
    }

    /**
     * Defaults to position (0,0,-5), target (0,0,0).
     * @param options Optional options, can give initial `position` and `target`.
     */
    constructor(options?: {
        position?: Vec3,
        target?: Vec3,
        fov?: number,
        aspect?: number,
        zNear?: number,
        zFar?: number,
    }) {
        super(options);

        const position = options?.position ?? vec3.create(0, 0, -5);
        const target = options?.target ?? vec3.create(0, 0, 0);
        const forward = vec3.normalize(vec3.sub(position, target));
        this.recalculateAngles(forward);
        this.position = position;
    }

    /**
     * The camera matrix.
     */
    get matrix() {
        return super.matrix;
    }

    /**
     * Assigns `mat` to the camera matrix, and recalcuates the camera angles.
     */
    set matrix(mat: Mat4) {
        super.matrix = mat;
        this.recalculateAngles(this.back);
    }

    /**
     * Update state of the camera.
     * @param deltaTime Time in seconds since last update.
     * @param input State of input.
     * @returns The view matrix.
     */
    update(deltaTime: number, input: Input): Mat4 {
        // Apply the delta rotation to the pitch and yaw angles
        this.yaw -= input.analog.x * deltaTime * this.rotationSpeed;
        this.pitch -= input.analog.y * deltaTime * this.rotationSpeed;

        // Wrap yaw between [0° .. 360°], just to prevent large accumulation.
        this.yaw = mod(this.yaw, Math.PI * 2);
        // Clamp pitch between [-90° .. +90°] to prevent somersaults.
        this.pitch = clamp(this.pitch, -Math.PI / 2, Math.PI / 2);

        // Save the current position, as we're about to rebuild the camera matrix.
        const position = vec3.copy(this.position);

        // Reconstruct the camera's rotation, and store into the camera matrix.
        super.matrix = mat4.rotateX(mat4.rotationY(this.yaw), this.pitch);

        // Calculate the new target velocity
        const digital = input.digital;
        const deltaRight = this.sign(digital.right, digital.left);
        const deltaUp = this.sign(digital.up, digital.down);
        const targetVelocity = vec3.create();
        const deltaBack = this.sign(digital.backward, digital.forward);
        vec3.addScaled(targetVelocity, this.right, deltaRight, targetVelocity);
        vec3.addScaled(targetVelocity, this.up, deltaUp, targetVelocity);
        vec3.addScaled(targetVelocity, this.back, deltaBack, targetVelocity);
        vec3.normalize(targetVelocity, targetVelocity);
        vec3.mulScalar(targetVelocity, this.movementSpeed, targetVelocity);

        // Mix new target velocity
        this.velocity = lerp(
            targetVelocity,
            this.velocity,
            Math.pow(1 - this.frictionCoefficient, deltaTime)
        );

        // Integrate velocity to calculate new position
        this.position = vec3.addScaled(position, this.velocity, deltaTime);

        // Invert the camera matrix to build the view matrix
        this.view = mat4.invert(this.matrix, this.view);

        return this.view;
    }

    // Recalculates the yaw and pitch values from a directional vector
    recalculateAngles(dir: Vec3) {
        this.yaw = Math.atan2(dir[0], dir[2]);
        this.pitch = -Math.asin(dir[1]);
    }

    protected sign(positive: boolean, negative: boolean) {
        return (positive ? 1 : 0) - (negative ? 1 : 0)
    }
}
