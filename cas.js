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
    get rows() { return this.data.length; }
    get cols() { return this.data[0].length; }
    toString() {
        return `[${this.data.map(row => `[${row.map(v => typeof v === 'number' ? Math.round(v * 10000) / 10000 : v).join(", ")}]`).join(", ")}]`;
    }
}

const EPSILON = 1e-10;

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

function getTransformationMatrix(type, val, trace = []) {
    const t = type.toLowerCase();
    const rad = (v) => v * Math.PI / 180;
    
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
function Un(a, op, b, trace = []) {
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
            return multiplyMatricesInternal(a, b, trace);
        }
    }

    // Matrix * Scalar
    if (a instanceof Matrix && typeof b === "number" && op === "*") {
        return new Matrix(a.data.map(r => r.map(v => v * b)));
    }
    if (typeof a === "number" && b instanceof Matrix && op === "*") {
        return new Matrix(b.data.map(r => r.map(v => v * a)));
    }
    // Matrix ^ Number (Power)
    if (a instanceof Matrix && typeof b === "number" && op === "^") {
        if (a.rows !== a.cols) throw new Error("Matrix power is only defined for square matrices");
        if (!Number.isInteger(b) || b < 0) throw new Error("Matrix power only supports non-negative integers");
        
        if (b === 0) return new Matrix(identity(a.rows));
        
        let res = a;
        const log = (msg) => trace.push(`Step: ${msg}`);
        log(`Algo: Raising matrix to power ${b}`);
        for (let i = 1; i < b; i++) {
            // Pass trace only for the first step or small powers to balance detail and performance
            const iterTrace = (i === 1) ? trace : [];
            res = multiplyMatricesInternal(res, a, iterTrace);
        }
        return res;
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
    if (op === "log") return Math.log(a);
    if (op === "exp") return Math.exp(a);

    throw new Error(`Operation ${op} not supported for these types`);
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
            const result = Un(left, node.op, right, trace);
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
                log(`Algo: Symbolic differentiation requested`);
                const diffAst = differentiate(node.args[0], node.args[1].name, trace);
                return `d/d${node.args[1].name} = ${astToString(diffAst)}`;
            }

            // Symbolic simplification
            if (node.name === "simplify") {
                log(`Algo: Symbolic simplification requested`);
                const simplifiedAst = simplify(node.args[0], trace);
                return `Simplified: ${astToString(simplifiedAst)}`;
            }

            const args = node.args.map(arg => evaluate(arg, trace));

            // Linear Algebra Routing
            const laOps = ["det", "ref", "rref", "lu", "qr", "eig", "inv", "trans", "mul", "rank", "nullity", "rowspace", "colspace", "nullspace"];
            if (laOps.includes(node.name)) {
                const M = args[0];
                if (!(M instanceof Matrix)) throw new Error(`${node.name} requires a Matrix`);
                
                log(`Trace: Routing LA op ${node.name}`);
                
                if (node.name === "mul") {
                    const M2 = args[1];
                    if (!(M2 instanceof Matrix)) throw new Error("mul requires two matrices");
                    return multiplyMatricesInternal(M, M2, trace);
                }

                if (node.name === "det") return determinant(M.data, trace);
                if (node.name === "ref") return new Matrix(toREF(M.data, trace));
                if (node.name === "rref") return new Matrix(toRREF(M.data, trace));
                if (node.name === "inv") return new Matrix(inverse(M.data, trace));
                if (node.name === "trans") return new Matrix(transpose(M.data));
                if (node.name === "rank") return rank(M.data, trace);
                if (node.name === "nullity") return M.cols - rank(M.data, trace);
                if (node.name === "rowspace") return new Matrix(rowspace(M.data, trace));
                if (node.name === "colspace") return new Matrix(colspace(M.data, trace));
                if (node.name === "nullspace") return new Matrix(nullspace(M.data, trace));
                if (node.name === "lu") {
                    const { L, U } = lu(M.data, trace);
                    return `L = ${L.toString()}, U = ${U.toString()}`;
                }
                if (node.name === "qr") {
                    const { Q, R } = qr(M.data, trace);
                    return `Q = ${Q.toString()}, R = ${R.toString()}`;
                }
                if (node.name === "eig") {
                    const evals = eigenvalues(M.data, 50, trace);
                    const evecs = getEigenvectors(M.data, evals, trace);
                    return `Eigenvalues: [${evals.map(v => v.toFixed(4)).join(", ")}], Eigenvectors: ${evecs.toString()}`;
                }
            }

            if (node.name === "transform") {
                const type = args[0];
                const val = args[1] || 0;
                log(`Algo: Generating transformation matrix for ${type}`);
                return getTransformationMatrix(type, val, trace);
            }

            // User defined functions
            if (node.name in ENV.funcs) {
                const func = ENV.funcs[node.name];
                log(`Calling user function ${node.name} with ${args[0]}`);
                const subbedBody = substitute(func.body, func.param, args[0], trace);
                return evaluate(subbedBody, trace);
            }

            // Built-in functions
            const result = Un(args[0], node.name, null, trace);
            log(`Function ${node.name}(${args[0]}) = ${result}`);
            return result;
        }
    }
}

/**
 * Symbolic Differentiation Engine
 */
function differentiate(node, variable, trace = []) {
    const log = (msg) => trace.push(`Rule: ${msg}`);
    
    switch (node.type) {
        case "Number": 
            log(`Constant Rule: d/d${variable}(${node.value}) = 0`);
            return { type: "Number", value: 0 };
        case "Symbol":
            const res = node.name === variable ? 1 : 0;
            log(`${node.name === variable ? 'Variable' : 'Constant'} Rule: d/d${variable}(${node.name}) = ${res}`);
            return { type: "Number", value: res };
        case "Binary":
            if (node.op === "+") {
                log(`Sum Rule: d/d${variable}(f + g) = f' + g'`);
                return { type: "Binary", op: "+", left: differentiate(node.left, variable, trace), right: differentiate(node.right, variable, trace) };
            }
            if (node.op === "-") {
                log(`Difference Rule: d/d${variable}(f - g) = f' - g'`);
                return { type: "Binary", op: "-", left: differentiate(node.left, variable, trace), right: differentiate(node.right, variable, trace) };
            }
            if (node.op === "*") {
                log(`Product Rule: d/d${variable}(fg) = f'g + fg'`);
                return {
                    type: "Binary", op: "+",
                    left: { type: "Binary", op: "*", left: differentiate(node.left, variable, trace), right: node.right },
                    right: { type: "Binary", op: "*", left: node.left, right: differentiate(node.right, variable, trace) }
                };
            }
            if (node.op === "^" && node.right.type === "Number") {
                const n = node.right.value;
                log(`Power Rule: d/d${variable}(x^${n}) = ${n}x^${n-1}`);
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

function substitute(node, param, value, trace = []) {
    if (node.type === "Symbol" && node.name === param) {
        return { type: "Number", value: value };
    }
    if (node.type === "Binary") {
        return { ...node, left: substitute(node.left, param, value, trace), right: substitute(node.right, param, value, trace) };
    }
    if (node.type === "Unary") {
        return { ...node, value: substitute(node.value, param, value, trace) };
    }
    if (node.type === "Call") {
        return { ...node, args: node.args.map(arg => substitute(arg, param, value, trace)) };
    }
    return node;
}

/**
 * Symbolic Simplification Engine
 */
function simplify(node, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    
    if (node.type === "Number" || node.type === "Symbol") return node;
    
    if (node.type === "Binary") {
        let L = simplify(node.left, trace);
        let R = simplify(node.right, trace);
        
        // Constant Folding
        if (L.type === "Number" && R.type === "Number" && typeof L.value === "number" && typeof R.value === "number") {
            const res = Un(L.value, node.op, R.value);
            log(`Constant Folding: ${L.value} ${node.op} ${R.value} = ${res}`);
            return { type: "Number", value: res };
        }
        
        // Identity Rules
        if (node.op === "+") {
            if (L.type === "Number" && L.value === 0) {
                log(`Additive Identity: 0 + ${astToString(R)} = ${astToString(R)}`);
                return R;
            }
            if (R.type === "Number" && R.value === 0) {
                log(`Additive Identity: ${astToString(L)} + 0 = ${astToString(L)}`);
                return L;
            }
            if (astToString(L) === astToString(R)) {
                log(`Combine terms: ${astToString(L)} + ${astToString(R)} = 2 * ${astToString(L)}`);
                return simplify({ type: "Binary", op: "*", left: { type: "Number", value: 2 }, right: L }, trace);
            }
        }
        
        if (node.op === "*") {
            if (L.type === "Number" && L.value === 0) {
                log(`Zero Property: 0 * ${astToString(R)} = 0`);
                return { type: "Number", value: 0 };
            }
            if (R.type === "Number" && R.value === 0) {
                log(`Zero Property: ${astToString(L)} * 0 = 0`);
                return { type: "Number", value: 0 };
            }
            if (L.type === "Number" && L.value === 1) {
                log(`Multiplicative Identity: 1 * ${astToString(R)} = ${astToString(R)}`);
                return R;
            }
            if (R.type === "Number" && R.value === 1) {
                log(`Multiplicative Identity: ${astToString(L)} * 1 = ${astToString(L)}`);
                return L;
            }
        }

        return { ...node, left: L, right: R };
    }
    
    if (node.type === "Unary") {
        const val = simplify(node.value, trace);
        if (val.type === "Number") {
            log(`Unary simplification: -${val.value} = ${-val.value}`);
            return { type: "Number", value: -val.value };
        }
        return { ...node, value: val };
    }

    if (node.type === "Call") {
        return { ...node, args: node.args.map(arg => simplify(arg, trace)) };
    }

    return node;
}



/**
 * Linear Algebra Algorithms
 */
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

function transpose(m) {
    return m[0].map((_, i) => m.map(row => row[i]));
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



const PRECEDENCE = {
    "+": 1, "-": 1,
    "*": 2, "/": 2,
    "^": 3
};

/**
 * LaTeX Output Generation
 */
function astToLaTeX(node, parentOp = null) {
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
        const currentPrec = PRECEDENCE[node.op] || 0;
        const parentPrec = PRECEDENCE[parentOp] || 0;
        
        let L = astToLaTeX(node.left, node.op);
        let R = astToLaTeX(node.right, node.op);
        
        let res = "";
        switch (node.op) {
            case "+": res = `${L} + ${R}`; break;
            case "-": res = `${L} - ${R}`; break;
            case "*": res = `${L} \\cdot ${R}`; break;
            case "/": res = `\\frac{${L}}{${R}}`; break;
            case "^": res = `{${L}}^{${R}}`; break;
        }

        if (parentPrec > currentPrec) {
            return `\\left( ${res} \\right)`;
        }
        return res;
    }
    if (node.type === "Unary") {
        return `-${astToLaTeX(node.value, "unary")}`;
    }
    if (node.type === "Call") {
        const args = node.args.map(arg => astToLaTeX(arg)).join(", ");
        if (node.name === "sqrt") return `\\sqrt{${args}}`;
        if (node.name === "diff") {
            const expr = astToLaTeX(node.args[0]);
            const variable = astToLaTeX(node.args[1]);
            return `\\frac{d}{d${variable}} \\left( ${expr} \\right)`;
        }
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
            
            // Split multiple results (e.g., "L = ..., U = ...")
            // This split ensures we don't break inside matrix brackets
            const parts = str.split(/,\s(?=[A-Z][a-z]*\s*[:=]|\s*[A-Z]\s*[:=])/);
            
            const processedParts = parts.map(part => {
                let p = part.trim();
                
                // 1. Wrap pure text in \text{}
                if (/^[a-zA-Z\s]+$/.test(p)) {
                    return `\\text{${p}}`;
                }

                // 2. Identify and wrap labels (e.g., "L =", "Eigenvalues:")
                p = p.replace(/^([a-zA-Z\s]+)([:=])\s*/g, "\\text{$1$2} ");
                
                // 3. Convert Matrix string [[a,b],[c,d]] to pmatrix
                if (p.includes("[[")) {
                    // Pre-process: remove outer matrix brackets if they exist after label
                    // "L = [[...]]" -> "L = [...], [...]"
                    p = p.replace(/\[\s*\[/g, "\\begin{pmatrix} ");
                    p = p.replace(/\]\s*\]/g, " \\end{pmatrix}");
                    p = p.replace(/\]\s*,\s*\[/g, " \\\\ ");
                    p = p.replace(/,\s*/g, " & ");
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

