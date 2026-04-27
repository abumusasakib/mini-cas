/**
 * Mini CAS (Computer Algebra System) Engine
 * Based on the Dispatcher Pattern
 */

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
    toString() {
        return `[${this.data.map(row => `[${row.join(", ")}]`).join(", ")}]`;
    }
}

const ENV = {
    vars: {
        pi: Math.PI,
        e: Math.E
    },
    funcs: {}
};

/**
 * The core dispatcher kernel.
 * Routes operations based on types and arity.
 */
function Un(a, op, b) {
    // 1. COMPLEX NUMBERS
    if (a instanceof Complex || b instanceof Complex) {
        const cA = a instanceof Complex ? a : new Complex(a, 0);
        const cB = b instanceof Complex ? b : new Complex(b, 0);

        switch (op) {
            case "+": return new Complex(cA.re + cB.re, cA.im + cB.im);
            case "-": return new Complex(cA.re - cB.re, cA.im - cB.im);
            case "*":
                return new Complex(
                    cA.re * cB.re - cA.im * cB.im,
                    cA.re * cB.im + cA.im * cB.re
                );
            case "/": {
                const denom = cB.re * cB.re + cB.im * cB.im;
                return new Complex(
                    (cA.re * cB.re + cA.im * cB.im) / denom,
                    (cA.im * cB.re - cA.re * cB.im) / denom
                );
            }
        }
    }

    // 2. MATRICES
    if (a instanceof Matrix && b instanceof Matrix) {
        if (op === "+") {
            return new Matrix(a.data.map((r, i) => r.map((v, j) => v + b.data[i][j])));
        }
        if (op === "-") {
            return new Matrix(a.data.map((r, i) => r.map((v, j) => v - b.data[i][j])));
        }
        if (op === "*") {
            // Matrix Multiplication
            const A = a.data;
            const B = b.data;
            if (A[0].length !== B.length) throw new Error("Matrix dimensions mismatch for multiplication");
            const res = Array(A.length).fill(0).map(() => Array(B[0].length).fill(0));
            for (let i = 0; i < A.length; i++) {
                for (let j = 0; j < B[0].length; j++) {
                    for (let k = 0; k < B.length; k++) {
                        res[i][j] += A[i][k] * B[k][j];
                    }
                }
            }
            return new Matrix(res);
        }
    }

    // Matrix * Scalar
    if (a instanceof Matrix && typeof b === "number" && op === "*") {
        return new Matrix(a.data.map(r => r.map(v => v * b)));
    }
    if (typeof a === "number" && b instanceof Matrix && op === "*") {
        return new Matrix(b.data.map(r => r.map(v => v * a)));
    }

    // 3. SCALAR MATH
    if (typeof a === "number" && typeof b === "number") {
        switch (op) {
            case "+": return a + b;
            case "-": return a - b;
            case "*": return a * b;
            case "/": return a / b;
            case "^": return Math.pow(a, b);
        }
    }

    // Single argument functions (using a different signature or handled in evaluator)
    if (op === "sqrt") return Math.sqrt(a);
    if (op === "sin") return Math.sin(a);
    if (op === "cos") return Math.cos(a);
    if (op === "tan") return Math.tan(a);
    if (op === "abs") return Math.abs(a);

    throw new Error(`Unsupported operation: ${a} ${op} ${b}`);
}

/**
 * Tokenizer with Implicit Multiplication Support
 */
function tokenize(input) {
    const regex = /\s*([0-9.]+|[a-zA-Z_]+|\+|\-|\*|\/|\^|\(|\)|,|\[|\]|=)\s*/g;
    const matches = input.match(regex);
    if (!matches) return [];
    const tokens = matches.map(t => t.trim());
    return insertImplicit(tokens);
}

function insertImplicit(tokens) {
    const out = [];
    for (let i = 0; i < tokens.length; i++) {
        out.push(tokens[i]);
        const a = tokens[i];
        const b = tokens[i + 1];
        if (!b) continue;

        // Number followed by Symbol/Paren or Symbol followed by Paren
        const left = /[0-9a-zA-Z\)]/.test(a);
        const right = /[a-zA-Z\(]/.test(b);
        const op = !["+", "-", "*", "/", "^", "(", ")", ",", "="].includes(a) && 
                   !["+", "-", "*", "/", "^", "(", ")", ",", "="].includes(b);

        if (left && right && op) {
            out.push("*");
        }
    }
    return out;
}

/**
 * Recursive Descent Parser
 */
function parse(tokens) {
    let pos = 0;
    const peek = () => tokens[pos];
    const next = () => tokens[pos++];

    function parseAssignment() {
        const currentTokens = tokens.slice(pos);
        const eqIdx = currentTokens.indexOf("=");
        
        if (eqIdx !== -1) {
            const left = next(); // Should be symbol
            if (peek() === "(") { // Function definition: f(x) = ...
                next(); // (
                const param = next();
                next(); // )
                next(); // =
                return { type: "FunctionDef", name: left, param, body: parseExpression() };
            }
            next(); // =
            return { type: "Assign", name: left, value: parseExpression() };
        }
        return parseExpression();
    }

    function parseExpression() {
        let node = parseTerm();
        while (["+", "-"].includes(peek())) {
            const op = next();
            node = { type: "Binary", op, left: node, right: parseTerm() };
        }
        return node;
    }

    function parseTerm() {
        let node = parseFactor();
        while (["*", "/"].includes(peek())) {
            const op = next();
            node = { type: "Binary", op, left: node, right: parseFactor() };
        }
        return node;
    }

    function parseFactor() {
        let node = parsePower();
        while (peek() === "^") {
            const op = next();
            node = { type: "Binary", op, left: node, right: parsePower() };
        }
        return node;
    }

    function parsePower() {
        if (peek() === "-") {
            next();
            return { type: "Unary", op: "-", value: parsePower() };
        }

        if (peek() === "(") {
            next();
            const expr = parseExpression();
            next();
            return expr;
        }

        if (!isNaN(peek())) {
            return { type: "Number", value: Number(next()) };
        }

        if (peek() === "[") {
            const parseArray = () => {
                next(); // [
                const data = [];
                while (peek() !== "]") {
                    if (peek() === "[") {
                        data.push(parseArray());
                    } else {
                        data.push(evaluate(parseExpression()));
                    }
                    if (peek() === ",") next();
                }
                next(); // ]
                return data;
            };
            const matrixData = parseArray();
            // If it's a 1D array like [1,2,3], we wrap it as [[1,2,3]] to keep 2D consistency for matrix ops
            // unless it's already higher dimensional.
            const unifiedData = (Array.isArray(matrixData) && !Array.isArray(matrixData[0])) 
                ? [matrixData] 
                : matrixData;
            return { type: "Number", value: new Matrix(unifiedData) };
        }

        if (/[a-zA-Z_]+/.test(peek())) {
            const name = next();
            if (peek() === "(") {
                next();
                const args = [];
                if (peek() !== ")") {
                    args.push(parseExpression());
                    while (peek() === ",") {
                        next();
                        args.push(parseExpression());
                    }
                }
                next();
                return { type: "Call", name, args };
            }
            return { type: "Symbol", name };
        }

        throw new Error(`Unexpected token: ${peek()}`);
    }

    return parseAssignment();
}

/**
 * Evaluator with XAI Trace
 */
function evaluate(node, trace = []) {
    const log = (msg) => trace.push(msg);

    switch (node.type) {
        case "Number":
            return node.value;

        case "Symbol":
            if (node.name in ENV.vars) {
                const val = ENV.vars[node.name];
                log(`Lookup variable ${node.name} = ${val}`);
                return val;
            }
            throw new Error(`Unknown variable: ${node.name}`);

        case "Assign": {
            const val = evaluate(node.value, trace);
            ENV.vars[node.name] = val;
            log(`Assign ${node.name} = ${val}`);
            return val;
        }

        case "Binary": {
            const left = evaluate(node.left, trace);
            const right = evaluate(node.right, trace);
            const result = Un(left, node.op, right);
            log(`Operation: ${left} ${node.op} ${right} = ${result}`);
            return result;
        }

        case "Unary": {
            const val = evaluate(node.value, trace);
            const result = -val;
            log(`Unary minus: -${val} = ${result}`);
            return result;
        }

        case "FunctionDef":
            ENV.funcs[node.name] = { param: node.param, body: node.body };
            log(`Define function ${node.name}(${node.param})`);
            return `Function ${node.name} defined`;

        case "Call": {
            // Special case: diff(expr, var)
            if (node.name === "diff") {
                log(`Symbolic differentiation requested`);
                const diffAst = differentiate(node.args[0], node.args[1].name);
                return `d/d${node.args[1].name} = ${astToString(diffAst)}`;
            }

            // Symbolic simplification
            if (node.name === "simplify") {
                log(`Symbolic simplification requested`);
                const simplifiedAst = simplify(node.args[0]);
                return `Simplified: ${astToString(simplifiedAst)}`;
            }

            const args = node.args.map(arg => evaluate(arg, trace));

            // Linear Algebra
            if (["det", "ref", "rref", "lu", "qr", "eig", "inv", "trans"].includes(node.name)) {
                const M = args[0];
                if (!(M instanceof Matrix)) throw new Error(`${node.name} requires a Matrix`);
                log(`Computing ${node.name} for matrix`);
                if (node.name === "det") return determinant(M.data);
                if (node.name === "ref") return new Matrix(toREF(M.data));
                if (node.name === "rref") return new Matrix(toRREF(M.data));
                if (node.name === "inv") return new Matrix(inverse(M.data));
                if (node.name === "trans") return new Matrix(transpose(M.data));
                if (node.name === "lu") {
                    const { L, U } = lu(M.data);
                    return `L = ${L.toString()}, U = ${U.toString()}`;
                }
                if (node.name === "qr") {
                    const { Q, R } = qr(M.data);
                    return `Q = ${Q.toString()}, R = ${R.toString()}`;
                }
                if (node.name === "eig") {
                    const evals = eigenvalues(M.data);
                    const evecs = getEigenvectors(M.data, evals);
                    return `Eigenvalues: [${evals.map(v => v.toFixed(4)).join(", ")}], Eigenvectors: ${evecs.toString()}`;
                }
            }

            // User defined functions
            if (node.name in ENV.funcs) {
                const func = ENV.funcs[node.name];
                log(`Calling user function ${node.name} with ${args[0]}`);
                // Simple substitution for evaluation
                const subbedBody = substitute(func.body, func.param, args[0]);
                return evaluate(subbedBody, trace);
            }

            // Built-in functions
            const result = Un(args[0], node.name);
            log(`Function ${node.name}(${args[0]}) = ${result}`);
            return result;
        }
    }
}

/**
 * Symbolic Differentiation Engine
 */
function differentiate(node, variable) {
    switch (node.type) {
        case "Number": return { type: "Number", value: 0 };
        case "Symbol":
            return { type: "Number", value: node.name === variable ? 1 : 0 };
        case "Binary":
            if (node.op === "+") {
                return { type: "Binary", op: "+", left: differentiate(node.left, variable), right: differentiate(node.right, variable) };
            }
            if (node.op === "-") {
                return { type: "Binary", op: "-", left: differentiate(node.left, variable), right: differentiate(node.right, variable) };
            }
            if (node.op === "*") {
                // Product Rule: (f*g)' = f'g + fg'
                return {
                    type: "Binary", op: "+",
                    left: { type: "Binary", op: "*", left: differentiate(node.left, variable), right: node.right },
                    right: { type: "Binary", op: "*", left: node.left, right: differentiate(node.right, variable) }
                };
            }
            if (node.op === "^" && node.right.type === "Number") {
                // Power Rule: (x^n)' = n * x^(n-1)
                const n = node.right.value;
                return {
                    type: "Binary", op: "*",
                    left: { type: "Number", value: n },
                    right: { type: "Binary", op: "^", left: node.left, right: { type: "Number", value: n - 1 } }
                };
            }
            break;
    }
    return { type: "Symbol", name: `diff(${astToString(node)}, ${variable})` };
}

function substitute(node, param, value) {
    if (node.type === "Symbol" && node.name === param) {
        return { type: "Number", value: value };
    }
    if (node.type === "Binary") {
        return { ...node, left: substitute(node.left, param, value), right: substitute(node.right, param, value) };
    }
    if (node.type === "Unary") {
        return { ...node, value: substitute(node.value, param, value) };
    }
    if (node.type === "Call") {
        return { ...node, args: node.args.map(arg => substitute(arg, param, value)) };
    }
    return node;
}

/**
 * Linear Algebra Algorithms
 */
function determinant(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;

    // Pseudo-determinant for non-square matrices
    if (rows !== cols) {
        const AT = transpose(matrix);
        if (rows > cols) {
            // det(AT * A)^0.5
            const ATA = Un(new Matrix(AT), "*", new Matrix(matrix)).data;
            return Math.sqrt(determinant(ATA));
        } else {
            // det(A * AT)^0.5
            const AAT = Un(new Matrix(matrix), "*", new Matrix(AT)).data;
            return Math.sqrt(determinant(AAT));
        }
    }

    const n = rows;
    let det = 1;
    const m = matrix.map(r => [...r]);
    for (let i = 0; i < n; i++) {
        let pivot = i;
        while (pivot < n && m[pivot][i] === 0) pivot++;
        if (pivot === n) return 0;
        if (pivot !== i) {
            [m[i], m[pivot]] = [m[pivot], m[i]];
            det *= -1;
        }
        det *= m[i][i];
        for (let j = i + 1; j < n; j++) {
            const factor = m[j][i] / m[i][i];
            for (let k = i + 1; k < n; k++) m[j][k] -= factor * m[i][k];
        }
    }
    return det;
}

const EPSILON = 1e-10;

function toREF(matrix) {
    const m = matrix.map(r => [...r]);
    const rows = m.length;
    const cols = m[0].length;
    let pivotRow = 0;
    for (let j = 0; j < cols && pivotRow < rows; j++) {
        let sel = pivotRow;
        while (sel < rows && Math.abs(m[sel][j]) < EPSILON) sel++;
        if (sel === rows) continue;
        [m[sel], m[pivotRow]] = [m[pivotRow], m[sel]];
        for (let i = pivotRow + 1; i < rows; i++) {
            const factor = m[i][j] / m[pivotRow][j];
            m[i][j] = 0;
            for (let k = j + 1; k < cols; k++) m[i][k] -= factor * m[pivotRow][k];
        }
        pivotRow++;
    }
    return m;
}

function toRREF(matrix) {
    const m = toREF(matrix);
    const rows = m.length;
    const cols = m[0].length;
    for (let i = rows - 1; i >= 0; i--) {
        let pivotCol = 0;
        while (pivotCol < cols && Math.abs(m[i][pivotCol]) < EPSILON) pivotCol++;
        if (pivotCol === cols) continue;
        const factor = m[i][pivotCol];
        for (let j = pivotCol; j < cols; j++) m[i][j] /= factor;
        for (let k = 0; k < i; k++) {
            const f = m[k][pivotCol];
            for (let j = pivotCol; j < cols; j++) m[k][j] -= f * m[i][j];
        }
    }
    return m;
}

function transpose(m) {
    return m[0].map((_, i) => m.map(row => row[i]));
}

function inverse(matrix) {
    const n = matrix.length;
    if (n !== matrix[0].length) throw new Error("Inverse only exists for square matrices");
    
    // Create augmented matrix [A | I]
    const I = identity(n);
    const augmented = matrix.map((row, i) => [...row, ...I[i]]);
    
    // Gauss-Jordan elimination
    for (let i = 0; i < n; i++) {
        // Find pivot
        let pivot = i;
        while (pivot < n && Math.abs(augmented[pivot][i]) < 1e-10) pivot++;
        if (pivot === n) throw new Error("Matrix is singular (non-invertible)");
        
        // Swap rows
        [augmented[i], augmented[pivot]] = [augmented[pivot], augmented[i]];
        
        // Scale pivot row
        const divisor = augmented[i][i];
        for (let j = i; j < 2 * n; j++) augmented[i][j] /= divisor;
        
        // Eliminate other rows
        for (let k = 0; k < n; k++) {
            if (k !== i) {
                const factor = augmented[k][i];
                for (let j = i; j < 2 * n; j++) {
                    augmented[k][j] -= factor * augmented[i][j];
                }
            }
        }
    }
    
    // Extract inverse
    return augmented.map(row => row.slice(n));
}

function lu(matrix) {
    const n = matrix.length;
    if (n !== matrix[0].length) throw new Error("LU requires a square matrix");
    const L = Array(n).fill(0).map((_, i) => Array(n).fill(0).map((_, j) => i === j ? 1 : 0));
    const U = matrix.map(r => [...r]);
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const factor = U[j][i] / U[i][i];
            L[j][i] = factor;
            for (let k = i; k < n; k++) U[j][k] -= factor * U[i][k];
        }
    }
    return { L: new Matrix(L), U: new Matrix(U) };
}

function qr(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const A = matrix.map(r => [...r]);
    const Q = Array(rows).fill(0).map(() => Array(cols).fill(0));
    const R = Array(cols).fill(0).map(() => Array(cols).fill(0));

    // Gram-Schmidt
    for (let j = 0; j < cols; j++) {
        let v = A.map(row => row[j]);
        for (let i = 0; i < j; i++) {
            R[i][j] = Q.map(row => row[i]).reduce((acc, q_ik, k) => acc + q_ik * v[k], 0);
            v = v.map((vk, k) => vk - R[i][j] * Q[k][i]);
        }
        R[j][j] = Math.sqrt(v.reduce((acc, vk) => acc + vk * vk, 0));
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

function eigenvalues(matrix, iterations = 100) {
    let A = matrix.map(r => [...r]);
    const n = A.length;
    for (let i = 0; i < iterations; i++) {
        const { Q, R } = qr(A);
        A = Un(R, "*", Q).data;
    }
    return A.map((r, i) => r[i]);
}

function getEigenvectors(matrix, evals) {
    const n = matrix.length;
    const vectors = [];
    for (const lambda of evals) {
        // Solve (A - lambda*I)x = 0
        const m = matrix.map((r, i) => r.map((v, j) => i === j ? v - lambda : v));
        const rref = toRREF(m);
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

/**
 * Symbolic Simplification Engine
 */
function simplify(node) {
    if (node.type === "Number" || node.type === "Symbol") return node;
    
    if (node.type === "Binary") {
        let L = simplify(node.left);
        let R = simplify(node.right);
        
        // Constant Folding
        if (L.type === "Number" && R.type === "Number" && typeof L.value === "number" && typeof R.value === "number") {
            return { type: "Number", value: Un(L.value, node.op, R.value) };
        }
        
        // Identity Rules
        if (node.op === "+") {
            if (L.type === "Number" && L.value === 0) return R;
            if (R.type === "Number" && R.value === 0) return L;
            if (astToString(L) === astToString(R)) {
                return simplify({ type: "Binary", op: "*", left: { type: "Number", value: 2 }, right: L });
            }
        }
        
        if (node.op === "*") {
            if (L.type === "Number" && L.value === 0) return { type: "Number", value: 0 };
            if (R.type === "Number" && R.value === 0) return { type: "Number", value: 0 };
            if (L.type === "Number" && L.value === 1) return R;
            if (R.type === "Number" && R.value === 1) return L;
        }

        return { ...node, left: L, right: R };
    }
    
    if (node.type === "Unary") {
        const val = simplify(node.value);
        if (val.type === "Number") return { type: "Number", value: -val.value };
        return { ...node, value: val };
    }

    if (node.type === "Call") {
        return { ...node, args: node.args.map(simplify) };
    }

    return node;
}

/**
 * LaTeX Output Generation
 */
function astToLaTeX(node) {
    if (node.type === "Number") {
        if (node.value instanceof Matrix) {
            return "\\begin{pmatrix}" + node.value.data.map(row => row.join(" & ")).join(" \\\\ ") + "\\end{pmatrix}";
        }
        if (node.value instanceof Complex) {
            return node.value.toString().replace("i", "\\imath");
        }
        return node.value.toString();
    }
    if (node.type === "Symbol") {
        if (node.name === "pi") return "\\pi";
        if (node.name === "e") return "e";
        return node.name;
    }
    if (node.type === "Binary") {
        const L = astToLaTeX(node.left);
        const R = astToLaTeX(node.right);
        switch (node.op) {
            case "+": return `${L} + ${R}`;
            case "-": return `${L} - ${R}`;
            case "*": return `${L} \\cdot ${R}`;
            case "/": return `\\frac{${L}}{${R}}`;
            case "^": return `{${L}}^{${R}}`;
        }
    }
    if (node.type === "Unary") {
        return `-${astToLaTeX(node.value)}`;
    }
    if (node.type === "Call") {
        const args = node.args.map(astToLaTeX).join(", ");
        if (node.name === "sqrt") return `\\sqrt{${args}}`;
        if (node.name === "diff") return `\\frac{d}{d${args.split(",")[1]}} \\left( ${args.split(",")[0]} \\right)`;
        return `\\operatorname{${node.name}}\\left( ${args} \\right)`;
    }
    if (node.type === "Assign") {
        return `${node.name} = ${astToLaTeX(node.value)}`;
    }
    if (node.type === "FunctionDef") {
        return `\\operatorname{${node.name}}\\left( ${node.param} \\right) = ${astToLaTeX(node.body)}`;
    }
    return "???";
}

function astToString(node) {
    if (node.type === "Number") return node.value.toString();
    if (node.type === "Symbol") return node.name;
    if (node.type === "Binary") return `(${astToString(node.left)} ${node.op} ${astToString(node.right)})`;
    if (node.type === "Unary") return `(-${astToString(node.value)})`;
    if (node.type === "Call") return `${node.name}(${node.args.map(astToString).join(", ")})`;
    return "???";
}

/**
 * Main Entry Point
 */
function calculate(expr) {
    const trace = [];
    try {
        const tokens = tokenize(expr);
        const ast = parse(tokens);
        const result = evaluate(ast, trace);
        const inputLatex = astToLaTeX(ast);
        
        // Generate result LaTeX
        let resultLatex = "";
        if (result instanceof Matrix || result instanceof Complex || typeof result === "number") {
            resultLatex = astToLaTeX({ type: "Number", value: result });
        } else if (typeof result === "string") {
            let str = result;
            
            // 1. Identify multiple results separated by ", "
            // We split by comma-space only if not inside brackets
            const parts = str.split(/,\s(?=[A-Z][a-z]*\s*[:=]|\s*[A-Z]\s*[:=])/);
            
            const processedParts = parts.map(part => {
                let p = part;
                
                // If the part is purely text (like "Function f defined"), wrap it entirely in \text{}
                // to avoid math italic spacing issues.
                if (/^[a-zA-Z\s]+$/.test(p.trim())) {
                    return `\\text{${p.trim()}}`;
                }

                // Handle Labels like "Q =", "Eigenvalues:", "Eigenvectors:"
                // We wrap them in \text{}
                p = p.replace(/([a-zA-Z\s]+)([:=])\s*/g, "\\text{$1$2} ");
                
                // Handle Matrices
                // We identify [[ ... ]] as pmatrix
                // We do the transformation in a specific order
                if (p.includes("[[")) {
                    p = p.replace(/\[\[/g, "\\begin{pmatrix}");
                    p = p.replace(/\]\]/g, "\\end{pmatrix}");
                    p = p.replace(/\],\s*\[/g, " \\\\ ");
                    
                    // Only replace commas that are BETWEEN \begin{pmatrix} and \end{pmatrix}
                    // and are NOT inside another label or structure.
                    // A simple way is to replace commas that are NOT followed by a space and "text"
                    // but wait, matrix elements are just numbers/symbols.
                    // So we replace commas that are NOT inside \text{}
                    p = p.replace(/,\s*(?![^\{]*\})/g, " & ");
                }
                
                return p;
            });
            
            resultLatex = processedParts.join(" \\quad ");
        }

        return { result, inputLatex, resultLatex, trace, error: null };
    } catch (e) {
        return { result: null, inputLatex: null, resultLatex: null, trace, error: e.message };
    }
}

// Export for use in app.js
if (typeof module !== "undefined") {
    module.exports = { calculate, Complex, Matrix, ENV, astToLaTeX };
}
