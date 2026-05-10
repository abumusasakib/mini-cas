const { calculate } = require('./cas.js');

describe('Mini CAS Engine - Consolidated Test Suite', () => {
    
    describe('Core Arithmetic & Functions', () => {
        test('Basic precedence: 3 + 4 * 2 = 11', () => {
            expect(calculate("3 + 4 * 2").result).toBe(11);
        });

        test('Square root: sqrt(16) = 4', () => {
            expect(calculate("sqrt(16)").result).toBe(4);
        });

        test('Implicit multiplication: 2pi', () => {
            expect(calculate("2pi").result).toBeCloseTo(2 * Math.PI);
        });
    });

    describe('State Management (Variables & User Functions)', () => {
        test('Variable assignment and multi-step evaluation', () => {
            expect(calculate("x = 10").result).toBe(10);
            expect(calculate("x * 2").result).toBe(20);
            expect(calculate("y = 0").result).toBe(0);
            expect(calculate("simplify(y + 10)").result).toBe("Simplified: (y + 10)");
        });

        test('User-defined functions', () => {
            expect(calculate("f(x) = x^2 + 1").result).toBe("Function f defined");
            expect(calculate("f(10)").result).toBe(101);
        });
    });

    describe('Symbolic Operations', () => {
        test('Differentiation: diff(x^3 + x, x)', () => {
            expect(calculate("diff(x^3 + x, x)").result).toBe("d/dx = ((3 * (x ^ 2)) + 1)");
        });

        test('Simplification: x + x + 0', () => {
            expect(calculate("simplify(z + z + 0)").result).toBe("Simplified: (2 * z)");
        });

        test('Constant simplification: 2 + 3 * 4', () => {
            expect(calculate("simplify(2 + 3 * 4)").result).toBe("Simplified: 14");
        });
    });

    describe('Linear Algebra', () => {
        test('Determinant of square matrix', () => {
            expect(calculate("det([[1,2],[3,4]])").result).toBe(-2);
        });

        test('Pseudo-determinant of non-square matrix', () => {
            expect(calculate("det([[1,2],[3,4],[5,6]])").result).toBeCloseTo(4.898979, 5);
        });

        test('LU Factorization output formatting', () => {
            const res = calculate("lu([[1,2],[3,4]])").result;
            expect(res).toContain("L = [[1, 0], [3, 1]]");
            expect(res).toContain("U = [[1, 2], [0, -2]]");
        });

        test('LU Factorization 3x3: lu([[2,3,5],[1,6,7],[4,1,3]])', () => {
            const { result, resultLatex } = calculate("lu([[2,3,5],[1,6,7],[4,1,3]])");
            expect(result).toContain("L = [[1, 0, 0], [0.5, 1, 0], [2, -1.1111111111111112, 1]]");
            expect(result).toContain("U = [[2, 3, 5], [0, 4.5, 4.5], [0, 0, -2]]");
            expect(resultLatex).toContain("\\begin{pmatrix} 1 & 0 & 0 \\\\ 0.5 & 1 & 0 \\\\ 2 & -1.1111111111111112 & 1 \\end{pmatrix}");
            expect(resultLatex).toContain("\\text{L =}");
        });

        test('QR Decomposition output formatting', () => {
            const res = calculate("qr([[1,2],[3,4]])").result;
            expect(res).toContain("Q = [[0.316");
            expect(res).toContain("R = [[3.162");
        });

        test('Eigenvalues and Eigenvectors output formatting', () => {
            const res = calculate("eig([[1,0],[0,2]])").result;
            expect(res).toContain("Eigenvalues: [1.0000, 2.0000]");
            expect(res).toContain("Eigenvectors: [[1, 0], [0, 1]]");
        });

        test('Matrix Inverse: inv([[1,2],[3,4]])', () => {
            const res = calculate("inv([[1,2],[3,4]])").result;
            expect(res.toString()).toContain("[[-2, 1], [1.5, -0.5]]");
        });

        test('Matrix Transpose: trans([[1,2,3],[4,5,6]])', () => {
            const res = calculate("trans([[1,2,3],[4,5,6]])").result;
            expect(res.toString()).toBe("[[1, 4], [2, 5], [3, 6]]");
        });
    });

    describe('LaTeX Output Validation (Regressions)', () => {
        test('QR Decomposition LaTeX formatting (no & outside matrix)', () => {
            const { resultLatex } = calculate("qr([[1,2],[3,4]])");
            expect(resultLatex).toContain("\\begin{pmatrix}");
            expect(resultLatex).toContain("\\text{Q =}");
            expect(resultLatex).not.toMatch(/Q = & /);
        });

        test('Eigenvalues LaTeX formatting (text wrapping)', () => {
            const { resultLatex } = calculate("eig([[1,0],[0,2]])");
            expect(resultLatex).toContain("\\text{Eigenvalues:} ");
            expect(resultLatex).toContain("\\text{Eigenvectors:} ");
            // Should have comma in eigenvalues list, not ampersand
            expect(resultLatex).toContain("1.0000, 2.0000");
            expect(resultLatex).not.toContain("1.0000 & 2.0000");
        });

        test('Assignment and Function Definition LaTeX (no ???)', () => {
            expect(calculate("x_val = 5").inputLatex).toBe("x_val = 5");
            expect(calculate("g(x) = x^2").inputLatex).toBe("\\operatorname{g}\\left( x \\right) = {x}^{2}");
            expect(calculate("x_val = 5").inputLatex).not.toContain("???");
        });

        test('Pure text results wrapping', () => {
            const { resultLatex } = calculate("h(x) = x^2");
            expect(resultLatex).toBe("\\text{Function h defined}");
        });
    });
});
