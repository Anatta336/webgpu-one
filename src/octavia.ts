import NoiseTable from "./noiseTable";

/*
--------------------------------------------------------------------------------

Octavia Noise
Original by Loren Schmidt: https://github.com/lorenSchmidt/fractal_cell_noise

--------------------------------------------------------------------------------

this is the heart of the cellular noise algorithm. it's a single x, y lookup.
the noise loops on itself, and is a rectangle xsize by ysize.
x and y are the current point in space we are calculating for (floating point is fine).
the space is divided into squares. n points are deterministically placed
+---------+ in the square ("samples" controls this). each is given a random
|   x     | height, by default -1 to 1. a soft 0-1 kernel is centered on each.
|         | it has a diameter equal to the square size, outside of which it
|x     x  | falls off cleanly to 0.
|  x      |
+---------+
at density 1 you have 1 square for the entire texture space.
at density 2 it's 2 squares by 2, etc..
seed is the seed for this octave.
softness alters the shape of the falloff (but it always has the same diameter).
the heights can be customized customized by setting the bias value (center) and range (it goes from bias - range to bias + range)
*/
export default class Octavia {

    xSize: number;
    ySize: number;
    seed: number = 0;

    density: number;
    octaves: number;
    amplitudeRatio: number;
    softness: number;
    samples: number;
    bias: number;
    range: number;

    noise: NoiseTable;

    constructor(
        xSize: number, ySize: number,
        density: number, octaves: number, amplitudeRatio: number,
        softness: number, samples: number,
        bias: number, range: number
    ) {
        this.xSize = xSize;
        this.ySize = ySize;
        this.density = density;
        this.octaves = octaves;
        this.amplitudeRatio = amplitudeRatio;
        this.softness = softness;
        this.samples = samples;
        this.bias = bias;
        this.range = range;

        this.noise = new NoiseTable();
    }

    sample(x: number, y: number) {
        let cumulativeHeight = 0;
        let seedForOctave = 0;

        for (let octaveIndex = 0; octaveIndex < this.octaves; octaveIndex++) {
            seedForOctave = this.noise.incrementExternalIndex(seedForOctave);
            const layer = this.curveStack2x2(x, y, this.density * 2 ** octaveIndex, seedForOctave);
            cumulativeHeight += (this.amplitudeRatio ** octaveIndex) * layer;
        }

        return 0.5 * cumulativeHeight;
    }

    curveStack2x2(x: number, y: number, density: number, seed: number): number {
        x /= this.xSize;
        y /= this.ySize;

        const ix = Math.floor(x * density);
        const iy = Math.floor(y * density);
        let ti = 0 // random number table index
        const dm1 = density - 1 // for the bitwise & instead of % range trick

        // this variant uses a trick to reduce samples
        // sample radius is 1/2 square edge instead of 1, which makes overlap from neighboring cells never more than 1/2 square length.
        // this means we can check which quadrant we're in and only check the three nearest neighbors, instead of all 8 neighbors.
        const left = ix - 1 + (Math.floor(x * 2 * density) & 1)
        const top = iy - 1 + (Math.floor(y * 2 * density) & 1)
        const right = left + 1; const bottom = top + 1

        // this uses every point within the radius.
        // when doing worley noise, we calculate distances for each point, and compare, getting various other parameters per point.
        // instead, we can drop the distance comparisons, and instead get a height per point and run it through a lightweight kernel, and accumulate
        let sum = 0;

        for (let cy = top; cy <= bottom; cy++) {
            for (let cx = left; cx <= right; cx++) {
                // this is a deterministic noise function with two integer inputs
                ti = this.noise.byPositionAndSeed(
                    (cx + density) & dm1,
                    (cy + density) & dm1,
                    seed
                );

                // this bounded curve runs from -1 to 1.
                // i believe this means that we want to multiply the distance by density.
                // however, this seems to leave seams? maybe i am wrong about the numbers.
                for (let a = 0; a < this.samples; a++) {
                    const px = (cx / density) + this.noise.byIndex(ti++) / this.noise.noiseTableSize / density;
                    const py = (cy / density) + this.noise.byIndex(ti++) / this.noise.noiseTableSize / density;

                    const distance_squared = density * density * ((x - px) ** 2 + (y - py) ** 2) * 4;

                    const h = this.bias + -this.range + 2 * this.range * this.noise.byIndex(ti++) / this.noise.noiseTableSize;
                    // this is a bounded -1 to 1 variant of the witch of agnesi. this will prevent seams when points drop out of the set.
                    if (distance_squared < 1.0) {
                        let amp = (this.softness * (1 - distance_squared) / (this.softness + distance_squared));
                        amp = amp * amp;
                        // note that this worked ^ 2, but the derivative was not 0 at -1 and 1
                        sum += h * amp;
                    }
                }
            }
        }

        return sum;
    }
}
