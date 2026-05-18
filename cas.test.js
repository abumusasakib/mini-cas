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

    describe('Vector Operations', () => {
        test('Norm of a vector: norm([3, 4])', () => {
            const { result } = calculate("norm([3, 4])");
            expect(result).toBe(5);
        });

        test('Unit vector: unit([3, 4])', () => {
            const { result } = calculate("unit([3, 4])");
            expect(result.toString()).toBe("[[0.6, 0.8]]");
        });

        test('Dot product of two vectors: dot([1, 2], [3, 4])', () => {
            const { result } = calculate("dot([1, 2], [3, 4])");
            expect(result).toBe(11);
        });

        test('Cross product of two 3D vectors: cross([1, 0, 0], [0, 1, 0])', () => {
            const { result } = calculate("cross([1, 0, 0], [0, 1, 0])");
            expect(result.toString()).toBe("[[0, 0, 1]]");
        });

        test('Angle between vectors in radians (default): angle([1, 0], [0, 1])', () => {
            const { result } = calculate("angle([1, 0], [0, 1])");
            expect(result).toBeCloseTo(Math.PI / 2);
        });

        test('Angle between vectors in degrees: angle([1, 0], [0, 1], deg)', () => {
            const { result } = calculate("angle([1, 0], [0, 1], deg)");
            expect(result).toBe(90);
        });

        test('Angle between vectors in radians explicitly: angle([1, 0], [0, 1], rad)', () => {
            const { result } = calculate("angle([1, 0], [0, 1], rad)");
            expect(result).toBeCloseTo(Math.PI / 2);
        });

        test('Vector division by scalar operator support', () => {
            const { result } = calculate("[6, 8] / 2");
            expect(result.toString()).toBe("[[3, 4]]");
        });

        test('Trigonometric functions degree vs radian mode', () => {
            expect(calculate("sin(90, deg)").result).toBeCloseTo(1);
            expect(calculate("cos(180, deg)").result).toBeCloseTo(-1);
            expect(calculate("sin(pi/2, rad)").result).toBeCloseTo(1);
        });

        test('Linear transformation degree vs radian mode', () => {
            const degResult = calculate("transform(projection, 45, deg)").result;
            const radResult = calculate("transform(projection, pi/4, rad)").result;
            
            expect(degResult.data[0][0]).toBeCloseTo(0.5);
            expect(degResult.data[0][1]).toBeCloseTo(0.5);
            expect(degResult.data[1][0]).toBeCloseTo(0.5);
            expect(degResult.data[1][1]).toBeCloseTo(0.5);
            
            expect(radResult.data[0][0]).toBeCloseTo(0.5);
            expect(radResult.data[0][1]).toBeCloseTo(0.5);
            expect(radResult.data[1][0]).toBeCloseTo(0.5);
            expect(radResult.data[1][1]).toBeCloseTo(0.5);
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

        test('Operator underscore escaping in Call and FunctionDef', () => {
            const { inputLatex } = calculate("normal_eq([[1]], [[1]])");
            expect(inputLatex).toContain("\\operatorname{normal\\_eq}");
            
            const defLatex = calculate("my_custom_func(x) = x").inputLatex;
            expect(defLatex).toContain("\\operatorname{my\\_custom\\_func}");
        });
    });

    describe('Machine Learning Linear Algebra Suite', () => {
        test('Sigmoid function mapping', () => {
            const { result } = calculate("sigmoid(0)");
            expect(result).toBeCloseTo(0.5);
            
            const matResult = calculate("sigmoid([[0, 2]])").result;
            expect(matResult.data[0][0]).toBeCloseTo(0.5);
            expect(matResult.data[0][1]).toBeCloseTo(1 / (1 + Math.exp(-2)));
        });

        test('Softmax function mapping', () => {
            const { result } = calculate("softmax([[1, 2, 3]])");
            const sum = result.data[0][0] + result.data[0][1] + result.data[0][2];
            expect(sum).toBeCloseTo(1.0);
            expect(result.data[0][2]).toBeGreaterThan(result.data[0][0]);
        });

        test('Normal Equation solver w* = (X^T * X)^-1 * X^T * y', () => {
            // Lecture 2 Worked Example:
            // X = [[1, 1], [1, 2], [1, 3]], y = [[1], [3], [3]]
            const { result } = calculate("normal_eq([[1, 1], [1, 2], [1, 3]], [[1], [3], [3]])");
            expect(result.data[0][0]).toBeCloseTo(0.3333, 3);
            expect(result.data[1][0]).toBeCloseTo(1.0, 3);
        });

        test('Feature scaling (MinMax and Z-Score)', () => {
            const minmax = calculate("minmax_scale([[10], [20], [30]])").result;
            expect(minmax.data[0][0]).toBe(0);
            expect(minmax.data[1][0]).toBe(0.5);
            expect(minmax.data[2][0]).toBe(1);
            
            const zscore = calculate("zscore_scale([[10], [20], [30]])").result;
            expect(zscore.data[0][0]).toBeLessThan(0);
            expect(zscore.data[1][0]).toBeCloseTo(0);
            expect(zscore.data[2][0]).toBeGreaterThan(0);
        });

        test('Regression Metrics', () => {
            // Pred = [2, 4], True = [1, 5]
            // Abs errors = [1, 1], MAE = 1
            // Sq errors = [1, 1], MSE = 1, RMSE = 1
            const maeVal = calculate("mae([[2], [4]], [[1], [5]])").result;
            expect(maeVal).toBe(1);
            
            const mseVal = calculate("mse([[2], [4]], [[1], [5]])").result;
            expect(mseVal).toBe(1);
            
            const rmseVal = calculate("rmse([[2], [4]], [[1], [5]])").result;
            expect(rmseVal).toBe(1);
            
            const r2Val = calculate("r_squared([[2], [4]], [[1], [5]])").result;
            expect(r2Val).toBeCloseTo(0.75); // SS_res = 2, SS_tot = 8 (mean of y is 3, (1-3)^2+(5-3)^2 = 8), 1 - 2/8 = 0.75
        });

        test('Confusion Matrix and Classification Metrics', () => {
            // Pred = [0.9, 0.1, 0.8, 0.2], True = [1, 0, 1, 1]
            // Pred >= 0.5: [1, 0, 1, 0]
            // TP: Pred=1, True=1 (2 times: index 0 and 2)
            // TN: Pred=0, True=0 (1 time: index 1)
            // FN: Pred=0, True=1 (1 time: index 3)
            // FP: Pred=1, True=0 (0 times)
            const cm = calculate("confusion_matrix([[0.9], [0.1], [0.8], [0.2]], [[1], [0], [1], [1]])").result;
            expect(cm.data[0][0]).toBe(2); // TP
            expect(cm.data[0][1]).toBe(1); // FN
            expect(cm.data[1][0]).toBe(0); // FP
            expect(cm.data[1][1]).toBe(1); // TN
            
            const acc = calculate("accuracy([[0.9], [0.1], [0.8], [0.2]], [[1], [0], [1], [1]])").result;
            expect(acc).toBe(0.75);
            
            const prec = calculate("precision([[0.9], [0.1], [0.8], [0.2]], [[1], [0], [1], [1]])").result;
            expect(prec).toBe(1.0); // TP / (TP+FP) = 2/2 = 1.0
            
            const rec = calculate("recall([[0.9], [0.1], [0.8], [0.2]], [[1], [0], [1], [1]])").result;
            expect(rec).toBeCloseTo(0.6667, 3); // TP / (TP+FN) = 2/3
            
            const f1 = calculate("fscore([[0.9], [0.1], [0.8], [0.2]], [[1], [0], [1], [1]])").result;
            expect(f1).toBeCloseTo(0.8, 3); // 2 * (1 * 2/3) / (1 + 2/3) = 4/3 / 5/3 = 0.8
        });

        test('Gradient Descent single update step for linear regression', () => {
            // X = [[1, 1000], [1, 1500]], y = [[150], [200]]
            // w = [[50], [0.1]]
            // y_pred = X*w = [[150], [200]]
            // err = y_pred - y = [[0], [0]]
            // grad = X^T * err = [[0], [0]]
            // w_new = w - alpha * grad = [[50], [0.1]]
            const w_new = calculate("gradient_descent([[1, 1000], [1, 1500]], [[150], [200]], [[50], [0.1]], 0.1, linear)").result;
            expect(w_new.data[0][0]).toBeCloseTo(50);
            expect(w_new.data[1][0]).toBeCloseTo(0.1);
        });

        test('Binary Cross-Entropy Loss', () => {
            const loss = calculate("binary_cross_entropy([[0.5], [0.5]], [[1], [0]])").result;
            expect(loss).toBeCloseTo(-Math.log(0.5));
        });
    });
});
