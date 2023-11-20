/**
 * Class to implement the Observer pattern.
 * All callbacks for a single observer should have the same signature.
 *
 * Usage example:
 * ```
 * type MyCallback = (arg1: string, arg2: number) => void;
 *
 * const myObserver = new Observer<MyCallback>();
 *
 * myObserver.addCallback((name: string, code: number) => {
 *    console.log(`${name} has code ${code}`);
 * });
 *
 * myObserver.notify('Alice', 123);
 * ```
 */
export default class Observer<T extends (...args: any[]) => void> {
    callbacks: T[];

    constructor() {
        this.callbacks = [];
    }

    addCallback(callback: T) {
        this.callbacks.push(callback);
    }

    removeCallback(callback: T) {
        const index = this.callbacks.indexOf(callback);
        if (index >= 0) {
            this.callbacks.splice(index, 1);
        }
    }

    removeAllCallbacks() {
        this.callbacks.length = 0;
    }

    notify(...args: Parameters<T>) {
        this.callbacks.forEach((callback) => {
            callback(...args);
        });
    }
}

export type SimpleCallback = () => void;
