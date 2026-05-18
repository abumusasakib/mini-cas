// Node environment imports
if (typeof require !== "undefined") {
    const mathObjects = require("./math-objects.js");
    global.Matrix = mathObjects.Matrix;
}

const PRECEDENCE = {
    "+": 1, "-": 1,
    "*": 2, "/": 2,
    "^": 3
};

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

function astToString(node) {
    if (node.type === "Number") return node.value.toString();
    if (node.type === "Symbol") return node.name;
    if (node.type === "Binary") return `(${astToString(node.left)} ${node.op} ${astToString(node.right)})`;
    if (node.type === "Unary") return `(-${astToString(node.value)})`;
    if (node.type === "Call") return `${node.name}(${node.args.map(astToString).join(", ")})`;
    return "???";
}

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.PRECEDENCE = PRECEDENCE;
    window.tokenize = tokenize;
    window.insertImplicit = insertImplicit;
    window.parse = parse;
    window.astToString = astToString;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = {
        PRECEDENCE,
        tokenize,
        insertImplicit,
        parse,
        astToString
    };
}
