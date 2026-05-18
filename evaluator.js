// Node environment imports
if (typeof require !== "undefined") {
    const mathObjects = require("./math-objects.js");
    const registry = require("./registry.js");
    const laAlgorithms = require("./la-algorithms.js");
    const parser = require("./parser.js");

    global.Complex = mathObjects.Complex;
    global.Matrix = mathObjects.Matrix;
    global.EPSILON = mathObjects.EPSILON;
    global.transpose = mathObjects.transpose;

    global.functionRegistry = registry.functionRegistry;
    global.opRegistry = registry.opRegistry;
    global.latexRegistry = registry.latexRegistry;

    global.determinant = laAlgorithms.determinant;
    global.toREF = laAlgorithms.toREF;
    global.toRREF = laAlgorithms.toRREF;
    global.inverse = laAlgorithms.inverse;
    global.lu = laAlgorithms.lu;
    global.qr = laAlgorithms.qr;
    global.eigenvalues = laAlgorithms.eigenvalues;
    global.getEigenvectors = laAlgorithms.getEigenvectors;
    global.rank = laAlgorithms.rank;
    global.rowspace = laAlgorithms.rowspace;
    global.colspace = laAlgorithms.colspace;
    global.nullspace = laAlgorithms.nullspace;
    global.getTransformationMatrix = laAlgorithms.getTransformationMatrix;
    global.multiplyMatricesInternal = laAlgorithms.multiplyMatricesInternal;
    global.identity = laAlgorithms.identity;
    global.norm = laAlgorithms.norm;
    global.unit = laAlgorithms.unit;
    global.dot = laAlgorithms.dot;
    global.cross = laAlgorithms.cross;
    global.angle = laAlgorithms.angle;
    global.sigmoid = laAlgorithms.sigmoid;
    global.softmax = laAlgorithms.softmax;
    global.normalEq = laAlgorithms.normalEq;
    global.scaleMinMax = laAlgorithms.scaleMinMax;
    global.scaleZScore = laAlgorithms.scaleZScore;
    global.getRegressionMetrics = laAlgorithms.getRegressionMetrics;
    global.getConfusionMatrix = laAlgorithms.getConfusionMatrix;
    global.getClassificationMetrics = laAlgorithms.getClassificationMetrics;
    global.gradientDescentStep = laAlgorithms.gradientDescentStep;
    global.binaryCrossEntropy = laAlgorithms.binaryCrossEntropy;

    global.astToString = parser.astToString;
    global.PRECEDENCE = parser.PRECEDENCE;
}

const ENV = {
    vars: {
        pi: Math.PI,
        e: Math.E,
        deg: "deg",
        rad: "rad",
        projection: "projection",
        reflection: "reflection",
        shear_h: "shear_h",
        shear_v: "shear_v",
        scale: "scale",
        linear: "linear",
        logistic: "logistic"
    },
    funcs: {}
};

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
            const handler = opRegistry.getBinary(node.op);
            if (handler) {
                const result = handler(left, right, trace);
                log(`Operation: ${left} ${node.op} ${right} = ${result}`);
                return result;
            }
            throw new Error(`Unsupported binary operator: ${node.op}`);
        }

        case "Unary": {
            const val = evaluate(node.value, trace);
            const handler = opRegistry.getUnary(node.op);
            if (handler) {
                const result = handler(val, trace);
                log(`Unary minus: -${val} = ${result}`);
                return result;
            }
            throw new Error(`Unsupported unary operator: ${node.op}`);
        }

        case "FunctionDef":
            ENV.funcs[node.name] = { param: node.param, body: node.body };
            log(`Define function ${node.name}(${node.param})`);
            return `Function ${node.name} defined`;

        case "Call": {
            // Special calls that take AST nodes directly (unevaluated arguments)
            if (node.name === "diff") {
                log(`Algo: Symbolic differentiation requested`);
                const diffAst = differentiate(node.args[0], node.args[1].name, trace);
                return `d/d${node.args[1].name} = ${astToString(diffAst)}`;
            }
            if (node.name === "simplify") {
                log(`Algo: Symbolic simplification requested`);
                const simplifiedAst = simplify(node.args[0], trace);
                return `Simplified: ${astToString(simplifiedAst)}`;
            }

            // User-defined functions
            if (node.name in ENV.funcs) {
                const args = node.args.map(arg => evaluate(arg, trace));
                const func = ENV.funcs[node.name];
                log(`Calling user function ${node.name} with ${args[0]}`);
                const subbedBody = substitute(func.body, func.param, args[0], trace);
                return evaluate(subbedBody, trace);
            }

            // Registered functions
            const handler = functionRegistry.get(node.name);
            if (handler) {
                const args = node.args.map(arg => evaluate(arg, trace));
                const result = handler(args, trace);
                log(`Function ${node.name}(${args.join(", ")}) = ${result}`);
                return result;
            }

            throw new Error(`Unknown function: ${node.name}`);
        }
    }
}

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

function simplify(node, trace = []) {
    const log = (msg) => trace.push(`Step: ${msg}`);
    
    if (node.type === "Number" || node.type === "Symbol") return node;
    
    if (node.type === "Binary") {
        let L = simplify(node.left, trace);
        let R = simplify(node.right, trace);
        
        // Constant Folding
        if (L.type === "Number" && R.type === "Number" && typeof L.value === "number" && typeof R.value === "number") {
            const res = evaluate({ type: "Binary", op: node.op, left: L, right: R });
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

function astToLaTeX(node, parentOp = null) {
    return latexRegistry.format(node, parentOp);
}

// OpRegistry and FunctionRegistry registrations
opRegistry.registerBinary("+", (a, b) => {
    if (a instanceof Complex || b instanceof Complex) {
        const cA = a instanceof Complex ? a : new Complex(a, 0);
        const cB = b instanceof Complex ? b : new Complex(b, 0);
        return new Complex(cA.re + cB.re, cA.im + cB.im);
    }
    if (a instanceof Matrix && b instanceof Matrix) {
        return new Matrix(a.data.map((r, i) => r.map((v, j) => v + b.data[i][j])));
    }
    if (typeof a === "number" && typeof b === "number") {
        return a + b;
    }
    throw new Error(`Addition not supported for these types`);
});

opRegistry.registerBinary("-", (a, b) => {
    if (a instanceof Complex || b instanceof Complex) {
        const cA = a instanceof Complex ? a : new Complex(a, 0);
        const cB = b instanceof Complex ? b : new Complex(b, 0);
        return new Complex(cA.re - cB.re, cA.im - cB.im);
    }
    if (a instanceof Matrix && b instanceof Matrix) {
        return new Matrix(a.data.map((r, i) => r.map((v, j) => v - b.data[i][j])));
    }
    if (typeof a === "number" && typeof b === "number") {
        return a - b;
    }
    throw new Error(`Subtraction not supported for these types`);
});

opRegistry.registerBinary("*", (a, b, trace = []) => {
    if (a instanceof Complex || b instanceof Complex) {
        const cA = a instanceof Complex ? a : new Complex(a, 0);
        const cB = b instanceof Complex ? b : new Complex(b, 0);
        return new Complex(
            cA.re * cB.re - cA.im * cB.im,
            cA.re * cB.im + cA.im * cB.re
        );
    }
    if (a instanceof Matrix && b instanceof Matrix) {
        return multiplyMatricesInternal(a, b, trace);
    }
    if (a instanceof Matrix && typeof b === "number") {
        return new Matrix(a.data.map(r => r.map(v => v * b)));
    }
    if (typeof a === "number" && b instanceof Matrix) {
        return new Matrix(b.data.map(r => r.map(v => v * a)));
    }
    if (typeof a === "number" && typeof b === "number") {
        return a * b;
    }
    throw new Error(`Multiplication not supported for these types`);
});

opRegistry.registerBinary("/", (a, b) => {
    if (a instanceof Complex || b instanceof Complex) {
        const cA = a instanceof Complex ? a : new Complex(a, 0);
        const cB = b instanceof Complex ? b : new Complex(b, 0);
        const denom = cB.re * cB.re + cB.im * cB.im;
        if (denom === 0) throw new Error("Division by zero in complex numbers");
        return new Complex(
            (cA.re * cB.re + cA.im * cB.im) / denom,
            (cA.im * cB.re - cA.re * cB.im) / denom
        );
    }
    if (a instanceof Matrix && typeof b === "number") {
        if (b === 0) throw new Error("Division by zero");
        return new Matrix(a.data.map(r => r.map(v => v / b)));
    }
    if (typeof a === "number" && typeof b === "number") {
        if (b === 0) throw new Error("Division by zero");
        return a / b;
    }
    throw new Error(`Division not supported for these types`);
});

opRegistry.registerBinary("^", (a, b, trace = []) => {
    if (a instanceof Matrix && typeof b === "number") {
        if (a.rows !== a.cols) throw new Error("Matrix power is only defined for square matrices");
        if (!Number.isInteger(b) || b < 0) throw new Error("Matrix power only supports non-negative integers");
        
        if (b === 0) return new Matrix(identity(a.rows));
        
        let res = a;
        for (let i = 1; i < b; i++) {
            const iterTrace = (i === 1) ? trace : [];
            res = multiplyMatricesInternal(res, a, iterTrace);
        }
        return res;
    }
    if (typeof a === "number" && typeof b === "number") {
        return Math.pow(a, b);
    }
    throw new Error(`Exponentiation not supported for these types`);
});

opRegistry.registerUnary("-", (val) => -val);

// Scalar standard math functions
functionRegistry.register("sin", (args) => {
    let val = args[0];
    if (args[1] === "deg") val = val * Math.PI / 180;
    return Math.sin(val);
});
functionRegistry.register("cos", (args) => {
    let val = args[0];
    if (args[1] === "deg") val = val * Math.PI / 180;
    return Math.cos(val);
});
functionRegistry.register("tan", (args) => {
    let val = args[0];
    if (args[1] === "deg") val = val * Math.PI / 180;
    return Math.tan(val);
});
functionRegistry.register("sqrt", (args) => Math.sqrt(args[0]));
functionRegistry.register("log", (args) => Math.log(args[0]));
functionRegistry.register("exp", (args) => Math.exp(args[0]));

// Linear algebra functions
functionRegistry.register("det", (args, trace) => determinant(args[0].data, trace));
functionRegistry.register("ref", (args, trace) => new Matrix(toREF(args[0].data, trace)));
functionRegistry.register("rref", (args, trace) => new Matrix(toRREF(args[0].data, trace)));
functionRegistry.register("inv", (args, trace) => new Matrix(inverse(args[0].data, trace)));
functionRegistry.register("trans", (args, trace) => new Matrix(transpose(args[0].data)));
functionRegistry.register("rank", (args, trace) => rank(args[0].data, trace));
functionRegistry.register("nullity", (args, trace) => args[0].cols - rank(args[0].data, trace));
functionRegistry.register("rowspace", (args, trace) => new Matrix(rowspace(args[0].data, trace)));
functionRegistry.register("colspace", (args, trace) => new Matrix(colspace(args[0].data, trace)));
functionRegistry.register("nullspace", (args, trace) => new Matrix(nullspace(args[0].data, trace)));
functionRegistry.register("lu", (args, trace) => {
    const { L, U } = lu(args[0].data, trace);
    return `L = ${L.toString()}, U = ${U.toString()}`;
});
functionRegistry.register("qr", (args, trace) => {
    const { Q, R } = qr(args[0].data, trace);
    return `Q = ${Q.toString()}, R = ${R.toString()}`;
});
functionRegistry.register("eig", (args, trace) => {
    const evals = eigenvalues(args[0].data, 50, trace);
    const evecs = getEigenvectors(args[0].data, evals, trace);
    return `Eigenvalues: [${evals.map(v => v.toFixed(4)).join(", ")}], Eigenvectors: ${evecs.toString()}`;
});
functionRegistry.register("mul", (args, trace) => {
    if (!(args[0] instanceof Matrix) || !(args[1] instanceof Matrix)) throw new Error("mul requires two matrices");
    return multiplyMatricesInternal(args[0], args[1], trace);
});
functionRegistry.register("transform", (args, trace) => {
    const type = args[0];
    const val = args[1] || 0;
    return getTransformationMatrix(type, val, args[2], trace);
});

// Vector operations
functionRegistry.register("norm", (args, trace) => norm(args[0], trace));
functionRegistry.register("unit", (args, trace) => unit(args[0], trace));
functionRegistry.register("dot", (args, trace) => dot(args[0], args[1], trace));
functionRegistry.register("cross", (args, trace) => cross(args[0], args[1], trace));
functionRegistry.register("angle", (args, trace) => angle(args[0], args[1], args[2], trace));
 
// Machine Learning and Regression Algorithms
functionRegistry.register("sigmoid", (args) => sigmoid(args[0]));
functionRegistry.register("softmax", (args) => softmax(args[0]));
functionRegistry.register("normal_eq", (args, trace) => normalEq(args[0], args[1], trace));
functionRegistry.register("minmax_scale", (args) => scaleMinMax(args[0]));
functionRegistry.register("zscore_scale", (args) => scaleZScore(args[0]));
functionRegistry.register("regression_metrics", (args, trace) => {
    const m = getRegressionMetrics(args[0], args[1], trace);
    return `MAE = ${m.mae.toFixed(4)}, MSE = ${m.mse.toFixed(4)}, RMSE = ${m.rmse.toFixed(4)}, R2 = ${m.r2.toFixed(4)}, MAPE = ${m.mape.toFixed(2)}%`;
});
functionRegistry.register("confusion_matrix", (args) => getConfusionMatrix(args[0], args[1]));
functionRegistry.register("classification_metrics", (args) => {
    const m = getClassificationMetrics(args[0], args[1]);
    return `Accuracy = ${(m.accuracy * 100).toFixed(2)}%, Precision = ${(m.precision * 100).toFixed(2)}%, Recall = ${(m.recall * 100).toFixed(2)}%, Specificity = ${(m.specificity * 100).toFixed(2)}%, F1-Score = ${(m.f1 * 100).toFixed(2)}%`;
});
functionRegistry.register("gradient_descent", (args, trace) => gradientDescentStep(args[0], args[1], args[2], args[3], args[4] || "linear", trace));
functionRegistry.register("binary_cross_entropy", (args) => binaryCrossEntropy(args[0], args[1]));

functionRegistry.register("mae", (args) => getRegressionMetrics(args[0], args[1], []).mae);
functionRegistry.register("mse", (args) => getRegressionMetrics(args[0], args[1], []).mse);
functionRegistry.register("rmse", (args) => getRegressionMetrics(args[0], args[1], []).rmse);
functionRegistry.register("r_squared", (args) => getRegressionMetrics(args[0], args[1], []).r2);
functionRegistry.register("r_sq", (args) => getRegressionMetrics(args[0], args[1], []).r2);
functionRegistry.register("accuracy", (args) => getClassificationMetrics(args[0], args[1]).accuracy);
functionRegistry.register("precision", (args) => getClassificationMetrics(args[0], args[1]).precision);
functionRegistry.register("recall", (args) => getClassificationMetrics(args[0], args[1]).recall);
functionRegistry.register("fscore", (args) => {
    const beta = args[2] === undefined ? 1 : args[2];
    const m = getClassificationMetrics(args[0], args[1]);
    if (beta === 1) return m.f1;
    const P = m.precision;
    const R = m.recall;
    return (P + R) === 0 ? 0 : (1 + beta * beta) * (P * R) / (beta * beta * P + R);
});


// LaTeX formatters registrations
latexRegistry.register("Number", (node) => {
    if (node.value instanceof Matrix) {
        return "\\begin{pmatrix}" + node.value.data.map(row => row.map(v => {
            if (typeof v === 'number') {
                if (Number.isInteger(v)) return v.toString();
                const rounded = Math.round(v * 100) / 100;
                return rounded === -0 ? "0" : rounded.toString();
            }
            return v;
        }).join(" & ")).join(" \\\\ ") + "\\end{pmatrix}";
    }
    if (node.value instanceof Complex) {
        return node.value.toString().replace("i", "\\imath");
    }
    return node.value.toString();
});

latexRegistry.register("Symbol", (node) => {
    if (node.name === "pi") return "\\pi";
    if (node.name === "e") return "e";
    return node.name;
});

latexRegistry.register("Binary", (node, parentOp) => {
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
});

latexRegistry.register("Unary", (node) => `-${astToLaTeX(node.value, "unary")}`);

latexRegistry.register("Call", (node) => {
    const args = node.args.map(arg => astToLaTeX(arg)).join(", ");
    if (node.name === "sqrt") return `\\sqrt{${args}}`;
    if (node.name === "diff") {
        const expr = astToLaTeX(node.args[0]);
        const variable = astToLaTeX(node.args[1]);
        return `\\frac{d}{d${variable}} \\left( ${expr} \\right)`;
    }
    const safeName = node.name.replace(/_/g, "\\_");
    return `\\operatorname{${safeName}}\\left( ${args} \\right)`;
});

latexRegistry.register("Assign", (node) => `${node.name} = ${astToLaTeX(node.value)}`);

latexRegistry.register("FunctionDef", (node) => {
    const safeName = node.name.replace(/_/g, "\\_");
    return `\\operatorname{${safeName}}\\left( ${node.param} \\right) = ${astToLaTeX(node.body)}`;
});

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.ENV = ENV;
    window.evaluate = evaluate;
    window.differentiate = differentiate;
    window.substitute = substitute;
    window.simplify = simplify;
    window.astToLaTeX = astToLaTeX;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = {
        ENV,
        evaluate,
        differentiate,
        substitute,
        simplify,
        astToLaTeX
    };
}
