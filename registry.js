class FunctionRegistry {
    constructor() {
        this.functions = new Map();
    }

    register(name, handler) {
        this.functions.set(name.toLowerCase(), handler);
    }

    get(name) {
        return this.functions.get(name.toLowerCase());
    }

    has(name) {
        return this.functions.has(name.toLowerCase());
    }
}

class OpRegistry {
    constructor() {
        this.binaryOps = new Map();
        this.unaryOps = new Map();
    }

    registerBinary(op, handler) {
        this.binaryOps.set(op, handler);
    }

    registerUnary(op, handler) {
        this.unaryOps.set(op, handler);
    }

    getBinary(op) {
        return this.binaryOps.get(op);
    }

    getUnary(op) {
        return this.unaryOps.get(op);
    }
}

class LaTeXRegistry {
    constructor() {
        this.formatters = new Map();
    }

    register(nodeType, formatter) {
        this.formatters.set(nodeType, formatter);
    }

    format(node, parentOp) {
        const formatter = this.formatters.get(node.type);
        if (formatter) {
            return formatter(node, parentOp);
        }
        return "???";
    }
}

const functionRegistry = new FunctionRegistry();
const opRegistry = new OpRegistry();
const latexRegistry = new LaTeXRegistry();

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.FunctionRegistry = FunctionRegistry;
    window.OpRegistry = OpRegistry;
    window.LaTeXRegistry = LaTeXRegistry;
    window.functionRegistry = functionRegistry;
    window.opRegistry = opRegistry;
    window.latexRegistry = latexRegistry;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = {
        FunctionRegistry,
        OpRegistry,
        LaTeXRegistry,
        functionRegistry,
        opRegistry,
        latexRegistry
    };
}
