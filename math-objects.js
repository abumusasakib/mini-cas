class Complex {
    constructor(re, im = 0) {
        this.re = re;
        this.im = im;
    }
    toString() {
        if (this.im === 0) return this.re.toString();
        const sign = this.im >= 0 ? "+" : "-";
        return `${this.re} ${sign} ${Math.abs(this.im)}i`;
    }
}

class Matrix {
    constructor(data) {
        this.data = data;
    }
    get rows() { return this.data.length; }
    get cols() { return this.data[0].length; }
    toString() {
        return `[${this.data.map(row => `[${row.join(", ")}]`).join(", ")}]`;
    }
}

const EPSILON = 1e-10;

function transpose(m) {
    return m[0].map((_, i) => m.map(row => row[i]));
}

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.Complex = Complex;
    window.Matrix = Matrix;
    window.EPSILON = EPSILON;
    window.transpose = transpose;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = { Complex, Matrix, EPSILON, transpose };
}
