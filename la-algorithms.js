// Node environment imports
if (typeof require !== "undefined") {
    const mathObjects = require("./math-objects.js");
    global.Complex = mathObjects.Complex;
    global.Matrix = mathObjects.Matrix;
    global.EPSILON = mathObjects.EPSILON;
    global.transpose = mathObjects.transpose;
}

function getTransformationMatrix(type, val, unit = "deg", trace = []) {
    let targetUnit = "deg";
    let targetTrace = trace;
    if (Array.isArray(unit)) {
        targetTrace = unit;
        targetUnit = "deg";
    } else if (typeof unit === "string") {
        targetUnit = unit.toLowerCase();
    }
    
    const t = type.toLowerCase();
    const rad = (v) => targetUnit === "rad" ? v : v * Math.PI / 180;
    
    if (t === "projection") {
        const a = rad(val);
        const c = Math.cos(a), s = Math.sin(a);
        return new Matrix([[c*c, c*s], [c*s, s*s]]);
    }
    if (t === "reflection") {
        const a = rad(val);
        const c = Math.cos(2*a), s = Math.sin(2*a);
        return new Matrix([[c, s], [s, -c]]);
    }
    if (t === "shear_h") {
        return new Matrix([[1, val], [0, 1]]);
    }
    if (t === "shear_v") {
        return new Matrix([[1, 0], [val, 1]]);
    }
    if (t === "scale") {
        return new Matrix([[val, 0], [0, val]]);
    }
    throw new Error(`Unknown transformation type: ${type}`);
}

function multiplyMatricesInternal(a, b, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const A = a.data;
    const B = b.data;
    if (A[0].length !== B.length) throw new Error("Matrix dimensions mismatch for multiplication");
    
    log(`Algo: Multiplying ${a.rows}x${a.cols} by ${b.rows}x${b.cols} matrix`);
    const res = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
    for (let i = 0; i < A.length; i++) {
        for (let j = 0; j < B[0].length; j++) {
            let sum = 0;
            let terms = [];
            for (let k = 0; k < B.length; k++) {
                const prod = A[i][k] * B[k][j];
                sum += prod;
                terms.push(`${A[i][k]}*${B[k][j]}`);
            }
            res[i][j] = sum;
            log(`Step: Cell (${i},${j}) = ${terms.join(" + ")} = ${sum}`);
        }
    }
    return new Matrix(res);
}

function rank(matrix, trace = []) {
    const rref = toRREF(matrix, []);
    let count = 0;
    for (const row of rref) {
        if (row.some(v => Math.abs(v) > EPSILON)) count++;
    }
    trace.push(`Step: Rank is the number of non-zero rows in RREF = ${count}`);
    return count;
}

function rowspace(matrix, trace = []) {
    const rref = toRREF(matrix, trace);
    const basis = rref.filter(row => row.some(v => Math.abs(v) > EPSILON));
    trace.push(`Step: Row space basis found from non-zero rows of RREF`);
    return basis;
}

function colspace(matrix, trace = []) {
    const rref = toRREF(matrix, trace);
    const pivotCols = [];
    for (let i = 0; i < rref.length; i++) {
        let j = 0;
        while (j < rref[0].length && Math.abs(rref[i][j]) < EPSILON) j++;
        if (j < rref[0].length) pivotCols.push(j);
    }
    trace.push(`Step: Identified pivot columns at indices: ${pivotCols.join(", ")}`);
    const basis = pivotCols.map(j => matrix.map(row => row[j]));
    return transpose(basis);
}

function nullspace(matrix, trace = []) {
    const rref = toRREF(matrix, trace);
    const rows = rref.length;
    const cols = rref[0].length;
    const pivots = new Array(cols).fill(-1);
    const pivotIndices = [];
    
    for (let i = 0; i < rows; i++) {
        let j = 0;
        while (j < cols && Math.abs(rref[i][j]) < EPSILON) j++;
        if (j < cols) {
            pivots[j] = i;
            pivotIndices.push(j);
        }
    }
    
    const freeVars = [];
    for (let j = 0; j < cols; j++) {
        if (pivots[j] === -1) freeVars.push(j);
    }
    
    trace.push(`Step: Free variables found at indices: ${freeVars.join(", ")}`);
    
    const basis = [];
    for (const free of freeVars) {
        const vec = new Array(cols).fill(0);
        vec[free] = 1;
        for (const pivotCol of pivotIndices) {
            vec[pivotCol] = -rref[pivots[pivotCol]][free];
        }
        basis.push(vec);
    }
    
    if (basis.length === 0) {
        trace.push(`Step: Only trivial null space found (0 vector)`);
        return [new Array(cols).fill(0)];
    }
    
    return transpose(basis);
}

function determinant(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Pseudo-determinant for non-square matrices
    if (rows !== cols) {
        log(`Pseudo-determinant for non-square matrix`);
        const AT = transpose(matrix);
        const mAT = new Matrix(AT);
        const mOriginal = new Matrix(matrix);
        
        if (rows > cols) {
            // det(AT * A)^0.5
            log(`Step: Using Gram matrix AT * A`);
            const ATA = multiplyMatricesInternal(mAT, mOriginal, trace).data;
            return Math.sqrt(determinant(ATA, trace));
        } else {
            // det(A * AT)^0.5
            log(`Step: Using Gram matrix A * AT`);
            const AAT = multiplyMatricesInternal(mOriginal, mAT, trace).data;
            return Math.sqrt(determinant(AAT, trace));
        }
    }

    const n = rows;
    let det = 1;
    const m = matrix.map(r => [...r]);
    for (let i = 0; i < n; i++) {
        let pivot = i;
        while (pivot < n && m[pivot][i] === 0) pivot++;
        if (pivot === n) {
            log(`Pivot column ${i} is zero, determinant is 0`);
            return 0;
        }
        if (pivot !== i) {
            log(`Pivot: Swapping row ${i} with ${pivot}`);
            [m[i], m[pivot]] = [m[pivot], m[i]];
            det *= -1;
        }
        log(`Pivot: Diagonal element ${m[i][i].toFixed(2)} at (${i},${i})`);
        det *= m[i][i];
        for (let j = i + 1; j < n; j++) {
            const factor = m[j][i] / m[i][i];
            log(`Step: Eliminating row ${j} using factor ${factor.toFixed(2)}`);
            for (let k = i + 1; k < n; k++) m[j][k] -= factor * m[i][k];
        }
    }
    return det;
}

function toREF(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const m = matrix.map(r => [...r]);
    const rows = m.length;
    const cols = m[0].length;
    let pivotRow = 0;
    for (let j = 0; j < cols && pivotRow < rows; j++) {
        let sel = pivotRow;
        while (sel < rows && Math.abs(m[sel][j]) < EPSILON) sel++;
        if (sel === rows) {
            log(`Step: Column ${j} is already zero below pivot`);
            continue;
        }
        if (sel !== pivotRow) {
            log(`Pivot: Swapping row ${pivotRow} with ${sel}`);
            [m[sel], m[pivotRow]] = [m[pivotRow], m[sel]];
        }
        log(`Pivot: Row ${pivotRow}, Col ${j} selected`);
        for (let i = pivotRow + 1; i < rows; i++) {
            const factor = m[i][j] / m[pivotRow][j];
            log(`Step: Eliminating element at (${i},${j})`);
            m[i][j] = 0;
            for (let k = j + 1; k < cols; k++) m[i][k] -= factor * m[pivotRow][k];
        }
        pivotRow++;
    }
    return m;
}

function toRREF(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const m = toREF(matrix, trace);
    const rows = m.length;
    const cols = m[0].length;
    log(`Algo: Starting backward elimination for RREF`);
    for (let i = rows - 1; i >= 0; i--) {
        let pivotCol = 0;
        while (pivotCol < cols && Math.abs(m[i][pivotCol]) < EPSILON) pivotCol++;
        if (pivotCol === cols) continue;
        const factor = m[i][pivotCol];
        log(`Step: Normalizing row ${i} by ${factor.toFixed(2)}`);
        for (let j = pivotCol; j < cols; j++) m[i][j] /= factor;
        for (let k = 0; k < i; k++) {
            const f = m[k][pivotCol];
            log(`Step: Zeroing out element above pivot at (${k},${pivotCol})`);
            for (let j = pivotCol; j < cols; j++) m[k][j] -= f * m[i][j];
        }
    }
    return m;
}

function inverse(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const n = matrix.length;
    if (n !== matrix[0].length) throw new Error("Inverse only exists for square matrices");
    
    log(`Algo: Forming augmented matrix [A|I]`);
    const I = identity(n);
    const augmented = matrix.map((row, i) => [...row, ...I[i]]);
    
    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let pivot = i;
        while (pivot < n && Math.abs(augmented[pivot][i]) < 1e-10) pivot++;
        if (pivot === n) throw new Error("Matrix is singular (non-invertible)");
        
        // Swap rows
        if (pivot !== i) {
            log(`Pivot: Swapping row ${i} with ${pivot}`);
            [augmented[i], augmented[pivot]] = [augmented[pivot], augmented[i]];
        }
        
        // Scale pivot row
        const divisor = augmented[i][i];
        log(`Step: Scaling row ${i} by ${divisor.toFixed(2)}`);
        for (let j = i; j < 2 * n; j++) augmented[i][j] /= divisor;
        
        // Eliminate other rows
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = augmented[k][i];
                log(`Step: Eliminating element at (${k},${i})`);
                for (let j = i; j < 2 * n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }
    
    // Extract inverse
    return augmented.map(row => row.slice(n));
}

function lu(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const n = matrix.length;
    if (n !== matrix[0].length) throw new Error("LU requires a square matrix");
    const L = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
    const U = matrix.map(r => [...r]);
    log(`Algo: Starting Doolittle algorithm for LU factorization`);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const factor = U[j][i] / U[i][i];
            log(`Step: Factor at (${j},${i}) = ${factor.toFixed(2)}`);
            L[j][i] = factor;
            for (let k = i; k < n; k++) U[j][k] -= factor * U[i][k];
        }
    }
    return { L: new Matrix(L), U: new Matrix(U) };
}

function qr(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const rows = matrix.length;
    const cols = matrix[0].length;
    const A = matrix.map(r => [...r]);
    const Q = Array(rows).fill(0).map(() => Array(cols).fill(0));
    const R = Array(cols).fill(0).map(() => Array(cols).fill(0));

    log(`Algo: Starting Gram-Schmidt process for QR`);
    for (let j = 0; j < cols; j++) {
        let v = A.map(row => row[j]);
        for (let i = 0; i < j; i++) {
            R[i][j] = Q.map(row => row[i]).reduce((acc, q_ik, k) => acc + q_ik * v[k], 0);
            log(`Step: Projecting column ${j} onto ${i}, R[${i}][${j}] = ${R[i][j].toFixed(2)}`);
            v = v.map((vk, k) => vk - R[i][j] * Q[k][i]);
        }
        R[j][j] = Math.sqrt(v.reduce((acc, vk) => acc + vk * vk, 0));
        log(`Step: Normalizing vector, R[${j}][${j}] = ${R[j][j].toFixed(2)}`);
        if (R[j][j] === 0) {
            for (let k = 0; k < rows; k++) Q[k][j] = 0;
        } else {
            for (let k = 0; k < rows; k++) Q[k][j] = v[k] / R[j][j];
        }
    }
    return { Q: new Matrix(Q), R: new Matrix(R) };
}

function identity(n) {
    return Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
}

function eigenvalues(matrix, iterations = 100, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    log(`Algo: Computing Eigenvalues via QR Algorithm (${iterations} iterations)`);
    let A = matrix.map(r => [...r]);
    const n = A.length;
    for (let i = 0; i < iterations; i++) {
        const { Q, R } = qr(A, []); // Don't spam inner QR trace
        // Only log multiplication details for the first iteration to avoid trace bloat
        const iterTrace = (i === 0) ? trace : [];
        A = multiplyMatricesInternal(R, Q, iterTrace).data;
        if (i % 20 === 0) {
            log(`Step: Iteration ${i}, current diagonals: [${A.map((r, idx) => r[idx].toFixed(2)).join(", ")}]`);
        }
    }
    const results = A.map((r, i) => r[i]);
    log(`Step: Final Eigenvalues: [${results.map(v => v.toFixed(4)).join(", ")}]`);
    return results;
}

function getEigenvectors(matrix, evals, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const n = matrix.length;
    const vectors = [];
    log(`Algo: Computing Eigenvectors by solving (A - λI)x = 0`);
    for (const lambda of evals) {
        log(`Step: Solving for λ = ${lambda.toFixed(4)}`);
        // Solve (A - lambda*I)x = 0
        const m = matrix.map((r, i) => r.map((v, j) => i === j ? v - lambda : v));
        const rref = toRREF(m, []); // Don't spam inner RREF trace
        // Extract basic nullspace vector (simplified for 1 vector)
        const vec = Array(n).fill(0);
        let found = false;
        for (let i = 0; i < n; i++) {
            let pivot = false;
            for (let j = 0; j < n; j++) if (rref[j][i] === 1) pivot = true;
            if (!pivot) {
                vec[i] = 1;
                for (let k = 0; k < i; k++) vec[k] = -rref[k][i] || 0;
                found = true;
                break;
            }
        }
        if (!found) vec[n - 1] = 1; // Fallback
        const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
        vectors.push(vec.map(v => v / mag));
    }
    return new Matrix(transpose(vectors));
}

function flattenVector(matrix) {
    if (!(matrix instanceof Matrix)) {
        throw new Error("Input must be a matrix vector");
    }
    const data = matrix.data;
    const rows = data.length;
    const cols = data[0].length;
    if (rows !== 1 && cols !== 1) {
        throw new Error("Input must be a 1D row or column vector");
    }
    return data.flat();
}

function norm(val, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    if (typeof val === "number") {
        const res = Math.abs(val);
        log(`Algo: Norm of scalar ${val} is ${res}`);
        return res;
    }
    const flat = flattenVector(val);
    const sumSq = flat.reduce((sum, v) => sum + v * v, 0);
    const result = Math.sqrt(sumSq);
    log(`Algo: Vector norm is sqrt(${flat.map(v => `${v}^2`).join(" + ")}) = ${result.toFixed(4)}`);
    return result;
}

function unit(matrix, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    if (typeof matrix === "number") {
        log(`Algo: Unit scalar of ${matrix} is ${matrix > 0 ? 1 : -1}`);
        return matrix > 0 ? 1 : -1;
    }
    const n = norm(matrix, trace);
    if (n < EPSILON) {
        throw new Error("Cannot normalize a zero vector");
    }
    log(`Algo: Normalizing vector by dividing each element by its norm ${n.toFixed(4)}`);
    const res = matrix.data.map(row => row.map(v => v / n));
    return new Matrix(res);
}

function dot(matrixA, matrixB, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const flatA = flattenVector(matrixA);
    const flatB = flattenVector(matrixB);
    if (flatA.length !== flatB.length) {
        throw new Error("Vector dimensions must match for dot product");
    }
    let sum = 0;
    const terms = [];
    for (let i = 0; i < flatA.length; i++) {
        sum += flatA[i] * flatB[i];
        terms.push(`${flatA[i]}*${flatB[i]}`);
    }
    log(`Algo: Dot product is ${terms.join(" + ")} = ${sum}`);
    return sum;
}

function cross(matrixA, matrixB, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    const flatA = flattenVector(matrixA);
    const flatB = flattenVector(matrixB);
    if (flatA.length !== 3 || flatB.length !== 3) {
        throw new Error("Cross product is only defined for 3D vectors");
    }
    const x = flatA[1]*flatB[2] - flatA[2]*flatB[1];
    const y = flatA[2]*flatB[0] - flatA[0]*flatB[2];
    const z = flatA[0]*flatB[1] - flatA[1]*flatB[0];
    
    log(`Algo: Cross product components:`);
    log(`  X = ${flatA[1]}*${flatB[2]} - ${flatA[2]}*${flatB[1]} = ${x}`);
    log(`  Y = ${flatA[2]}*${flatB[0]} - ${flatA[0]}*${flatB[2]} = ${y}`);
    log(`  Z = ${flatA[0]}*${flatB[1]} - ${flatA[1]}*${flatB[0]} = ${z}`);
    
    if (matrixA.data.length === 1) {
        return new Matrix([[x, y, z]]);
    } else {
        return new Matrix([[x], [y], [z]]);
    }
}

function angle(matrixA, matrixB, unit = "rad", trace = []) {
    let targetUnit = "rad";
    let targetTrace = trace;
    if (Array.isArray(unit)) {
        targetTrace = unit;
        targetUnit = "rad";
    } else if (typeof unit === "string") {
        targetUnit = unit.toLowerCase();
    }
    
    const log = (msg) => targetTrace.push(`Step: ${msg}`);
    log(`Algo: Calculating angle between vectors (${targetUnit === "deg" ? "degrees" : "radians"} mode)`);
    const d = dot(matrixA, matrixB, targetTrace);
    const normA = norm(matrixA, targetTrace);
    const normB = norm(matrixB, targetTrace);
    if (normA < EPSILON || normB < EPSILON) {
        throw new Error("Angle is undefined for zero vectors");
    }
    const cosTheta = d / (normA * normB);
    const clamped = Math.max(-1, Math.min(1, cosTheta));
    const rad = Math.acos(clamped);
    const deg = rad * 180 / Math.PI;
    
    log(`Step: cos(θ) = ${d.toFixed(4)} / (${normA.toFixed(4)} * ${normB.toFixed(4)}) = ${clamped.toFixed(4)}`);
    log(`Step: θ = acos(${clamped.toFixed(4)}) = ${rad.toFixed(4)} rad (${deg.toFixed(2)}°)`);
    
    if (targetUnit === "deg" || targetUnit === "degree" || targetUnit === "degrees") {
        log(`Step: Outputting in degrees: ${deg.toFixed(4)}°`);
        return deg;
    }
    log(`Step: Outputting in radians: ${rad.toFixed(4)} rad`);
    return rad;
}

// --- Machine Learning Linear Algebra Suite ---

function ensureMatrix(val) {
    if (val instanceof Matrix) return val;
    if (Array.isArray(val)) return new Matrix(val);
    if (typeof val === "number") return new Matrix([[val]]);
    throw new Error("Invalid input: expected Matrix, Array, or Number");
}

function sigmoid(z) {
    if (typeof z === "number") {
        return 1 / (1 + Math.exp(-z));
    }
    const mat = ensureMatrix(z);
    const data = mat.data.map(row => row.map(v => 1 / (1 + Math.exp(-v))));
    return new Matrix(data);
}

function softmax(z) {
    const mat = ensureMatrix(z);
    const flat = flattenVector(mat);
    const exps = flat.map(v => Math.exp(v));
    const sum = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map(v => v / sum);
    if (mat.cols === 1) {
        return new Matrix(probs.map(v => [v]));
    } else {
        return new Matrix([probs]);
    }
}

function normalEq(XMat, yMat, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    log("Algo: Solving normal equation w* = (X^T * X)^-1 * X^T * y");
    const X = ensureMatrix(XMat);
    const y = ensureMatrix(yMat);
    
    log(`Step: Design matrix X is ${X.rows}x${X.cols}, Target y is ${y.rows}x${y.cols}`);
    const XT = transpose(X.data);
    const XT_mat = new Matrix(XT);
    log(`Step: Computed transpose X^T (${XT_mat.rows}x${XT_mat.cols})`);
    
    const XTX = multiplyMatricesInternal(XT_mat, X, trace);
    log(`Step: Computed product X^T * X (${XTX.rows}x${XTX.cols})`);
    
    const invXTX = new Matrix(inverse(XTX.data, trace));
    log(`Step: Inverted X^T * X`);
    
    const XTy = multiplyMatricesInternal(XT_mat, y, trace);
    log(`Step: Computed product X^T * y (${XTy.rows}x${XTy.cols})`);
    
    const w = multiplyMatricesInternal(invXTX, XTy, trace);
    log(`Step: Final weight vector w* computed (${w.rows}x${w.cols})`);
    return w;
}

function scaleMinMax(XMat) {
    const X = ensureMatrix(XMat);
    const cols = X.cols;
    const rows = X.rows;
    const data = X.data;
    
    const res = Array(rows).fill(0).map(() => Array(cols).fill(0));
    for (let c = 0; c < cols; c++) {
        let colVals = data.map(r => r[c]);
        let min = Math.min(...colVals);
        let max = Math.max(...colVals);
        let diff = max - min;
        for (let r = 0; r < rows; r++) {
            res[r][c] = diff === 0 ? 0 : (data[r][c] - min) / diff;
        }
    }
    return new Matrix(res);
}

function scaleZScore(XMat) {
    const X = ensureMatrix(XMat);
    const cols = X.cols;
    const rows = X.rows;
    const data = X.data;
    
    const res = Array(rows).fill(0).map(() => Array(cols).fill(0));
    for (let c = 0; c < cols; c++) {
        let colVals = data.map(r => r[c]);
        let sum = colVals.reduce((a, b) => a + b, 0);
        let mean = sum / rows;
        let sqDiffSum = colVals.reduce((a, b) => a + Math.pow(b - mean, 2), 0);
        let std = Math.sqrt(sqDiffSum / rows);
        for (let r = 0; r < rows; r++) {
            res[r][c] = std === 0 ? 0 : (data[r][c] - mean) / std;
        }
    }
    return new Matrix(res);
}

function getRegressionMetrics(yPredMat, yTrueMat, trace = []) {
    const yPred = flattenVector(ensureMatrix(yPredMat));
    const yTrue = flattenVector(ensureMatrix(yTrueMat));
    const m = yTrue.length;
    if (m === 0) throw new Error("Empty target vector");
    
    let sumAbsErr = 0;
    let sumSqErr = 0;
    let sumActual = 0;
    let sumActualSqDiff = 0;
    let sumAbsPctErr = 0;
    
    for (let i = 0; i < m; i++) {
        const err = yPred[i] - yTrue[i];
        sumAbsErr += Math.abs(err);
        sumSqErr += err * err;
        sumActual += yTrue[i];
        if (yTrue[i] !== 0) {
            sumAbsPctErr += Math.abs(err / yTrue[i]);
        }
    }
    
    const meanActual = sumActual / m;
    for (let i = 0; i < m; i++) {
        sumActualSqDiff += Math.pow(yTrue[i] - meanActual, 2);
    }
    
    const mae = sumAbsErr / m;
    const mse = sumSqErr / m;
    const rmse = Math.sqrt(mse);
    const r2 = sumActualSqDiff === 0 ? 1 : 1 - (sumSqErr / sumActualSqDiff);
    const mape = (sumAbsPctErr / m) * 100;
    
    trace.push(`Step: MAE = ${mae.toFixed(4)}, MSE = ${mse.toFixed(4)}, RMSE = ${rmse.toFixed(4)}, R2 = ${r2.toFixed(4)}`);
    return { mae, mse, rmse, r2, mape };
}

function getConfusionMatrix(yPredMat, yTrueMat) {
    const yPred = flattenVector(ensureMatrix(yPredMat));
    const yTrue = flattenVector(ensureMatrix(yTrueMat));
    const m = yTrue.length;
    
    let tp = 0, fn = 0, fp = 0, tn = 0;
    for (let i = 0; i < m; i++) {
        const p = yPred[i] >= 0.5 ? 1 : 0;
        const t = yTrue[i] >= 0.5 ? 1 : 0;
        if (t === 1 && p === 1) tp++;
        else if (t === 1 && p === 0) fn++;
        else if (t === 0 && p === 1) fp++;
        else if (t === 0 && p === 0) tn++;
    }
    return new Matrix([[tp, fn], [fp, tn]]);
}

function getClassificationMetrics(yPredMat, yTrueMat) {
    const yPred = flattenVector(ensureMatrix(yPredMat));
    const yTrue = flattenVector(ensureMatrix(yTrueMat));
    const m = yTrue.length;
    
    let tp = 0, fn = 0, fp = 0, tn = 0;
    for (let i = 0; i < m; i++) {
        const p = yPred[i] >= 0.5 ? 1 : 0;
        const t = yTrue[i] >= 0.5 ? 1 : 0;
        if (t === 1 && p === 1) tp++;
        else if (t === 1 && p === 0) fn++;
        else if (t === 0 && p === 1) fp++;
        else if (t === 0 && p === 0) tn++;
    }
    
    const acc = (tp + tn) / m;
    const prec = (tp + fp) === 0 ? 0 : tp / (tp + fp);
    const rec = (tp + fn) === 0 ? 0 : tp / (tp + fn);
    const spec = (tn + fp) === 0 ? 0 : tn / (tn + fp);
    const f1 = (prec + rec) === 0 ? 0 : 2 * (prec * rec) / (prec + rec);
    
    return { accuracy: acc, precision: prec, recall: rec, specificity: spec, f1 };
}

function gradientDescentStep(XMat, yMat, wMat, alpha, type = "linear", trace = []) {
    const X = ensureMatrix(XMat);
    const y = ensureMatrix(yMat);
    const w = ensureMatrix(wMat);
    const m = X.rows;
    
    const z = multiplyMatricesInternal(X, w, trace);
    let y_pred = z;
    if (type.toLowerCase() === "logistic") {
        y_pred = sigmoid(z);
    }
    
    const errData = y_pred.data.map((row, r) => row.map((val, c) => val - y.data[r][c]));
    const err = new Matrix(errData);
    
    const XT = new Matrix(transpose(X.data));
    
    const XT_err = multiplyMatricesInternal(XT, err, trace);
    const gradData = XT_err.data.map(row => row.map(v => v / m));
    
    const w_newData = w.data.map((row, r) => row.map((v, c) => v - alpha * gradData[r][c]));
    return new Matrix(w_newData);
}

function binaryCrossEntropy(yPredMat, yTrueMat) {
    const yPred = flattenVector(ensureMatrix(yPredMat));
    const yTrue = flattenVector(ensureMatrix(yTrueMat));
    const m = yTrue.length;
    
    let sum = 0;
    for (let i = 0; i < m; i++) {
        const p = Math.max(EPSILON, Math.min(1 - EPSILON, yPred[i]));
        sum += yTrue[i] * Math.log(p) + (1 - yTrue[i]) * Math.log(1 - p);
    }
    return -sum / m;
}

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.getTransformationMatrix = getTransformationMatrix;
    window.multiplyMatricesInternal = multiplyMatricesInternal;
    window.rank = rank;
    window.rowspace = rowspace;
    window.colspace = colspace;
    window.nullspace = nullspace;
    window.determinant = determinant;
    window.toREF = toREF;
    window.toRREF = toRREF;
    window.inverse = inverse;
    window.lu = lu;
    window.qr = qr;
    window.identity = identity;
    window.eigenvalues = eigenvalues;
    window.getEigenvectors = getEigenvectors;
    window.flattenVector = flattenVector;
    window.norm = norm;
    window.unit = unit;
    window.dot = dot;
    window.cross = cross;
    window.angle = angle;
    window.sigmoid = sigmoid;
    window.softmax = softmax;
    window.normalEq = normalEq;
    window.scaleMinMax = scaleMinMax;
    window.scaleZScore = scaleZScore;
    window.getRegressionMetrics = getRegressionMetrics;
    window.getConfusionMatrix = getConfusionMatrix;
    window.getClassificationMetrics = getClassificationMetrics;
    window.gradientDescentStep = gradientDescentStep;
    window.binaryCrossEntropy = binaryCrossEntropy;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = {
        getTransformationMatrix,
        multiplyMatricesInternal,
        rank,
        rowspace,
        colspace,
        nullspace,
        determinant,
        toREF,
        toRREF,
        inverse,
        lu,
        qr,
        identity,
        eigenvalues,
        getEigenvectors,
        flattenVector,
        norm,
        unit,
        dot,
        cross,
        angle,
        sigmoid,
        softmax,
        normalEq,
        scaleMinMax,
        scaleZScore,
        getRegressionMetrics,
        getConfusionMatrix,
        getClassificationMetrics,
        gradientDescentStep,
        binaryCrossEntropy
    };
}
