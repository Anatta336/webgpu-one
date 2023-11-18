/**
 * --------------------------------------------------------------------------------
 *
 * Positional Random Number Generation
 * Original by Loren Schmidt: https://github.com/lorenSchmidt/fractal_cell_noise
 *
 * --------------------------------------------------------------------------------
 * For 2D value noise, we need to be able to input two coordinates and a seed, and
 * get a deterministic value for that point in space. You can substitute other
 * approaches for this one - this is a relatively simple, readable approach I came
 * up with but there are more cryptographically sound 3 input hashes out there.
 *
 * Note that if generalizing this for n dimensions, you'd want your number of
 * dimensions plus one for the seed.
 */
export default class NoiseTable {

    readonly noiseWidth: number;
    readonly noiseTableSize: number;
    readonly noiseTableSizeM: number;

    readonly primeCycleIncrement: number = 101159;

    protected noiseTable: number[] = [];
    protected readonly noiseSeed: number = 88883;

    protected nextIndex: number = 0;

    constructor(noiseWidth: number = 256) {
        this.noiseWidth = noiseWidth;
        this.noiseTableSize = this.noiseWidth * this.noiseWidth;
        this.noiseTableSizeM = this.noiseTableSize - 1;

        this.initTable();
    }

    protected initTable() {
        let list = []
        // Fill list with numbers 0 to noiseTableSize.
        for (let a = 0; a < this.noiseTableSize; a++) {
            list.push(a);
        }
        // Shuffle list into noiseTable.
        for (let a = 0; a < this.noiseTableSize; a++) {
            this.noiseTable[a] = this.drawCard(list);
        }
    }

    getNextIndex(): number {
        this.nextIndex += this.primeCycleIncrement;
        this.nextIndex = this.nextIndex % this.noiseTableSize;

        return this.nextIndex;
    }

    /**
     * @param index Should be integer.
     * @returns Pseudo-random number determined by index value. In range [0, 1).
     */
    byIndexNormalized(index: number): number {
        return this.byIndex(index) / this.noiseTableSize;
    }

    /**
     * @param index Should be integer.
     * @returns Pseudo-random integer determined by index value. In range [0, noiseTableSize).
     */
    byIndex(index: number): number {
        return this.noiseTable[index % this.noiseTableSize];
    }

    incrementExternalIndex(index: number): number {
        return (index + this.primeCycleIncrement) % this.noiseTableSize;
    }

    /**
     * @param x Should be integer.
     * @param y Should be integer.
     * @param seed Should be integer.
     * @returns Pseudo-random number determined by x, y, seed values. In range [0, 1).
     */
    byPositionAndSeedNormalized(x: number, y: number, seed: number): number {
        let linear = (x % this.noiseWidth) + (y % this.noiseWidth) * this.noiseWidth + seed;

        return this.byIndexNormalized(linear);
    }

    /**
     * @param x Should be integer.
     * @param y Should be integer.
     * @param seed Should be integer.
     * @returns Pseudo-random integer determined by x, y, seed values. In range [0, noiseTableSize).
     */
    byPositionAndSeed(x: number, y: number, seed: number): number {
        let linear = (x % this.noiseWidth) + (y % this.noiseWidth) * this.noiseWidth + seed;

        return this.byIndex(linear);
    }

    /**
     * Picks a random element from the array and returns it, removing it from the array.
     */
    protected drawCard<T>(array: T[]): T {
        if (!array.length) {
            throw new Error("drawCard running on array of size 0");
        }

        var index = Math.floor(Math.random() * array.length);

        return (array.splice(index, 1))[0];
    }
}
