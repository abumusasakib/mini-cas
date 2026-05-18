/**
 * Mini CAS (Computer Algebra System) Engine - Orchestrator
 * Modularized with the Registry Pattern
 */

// Node.js loader: dynamically loads all modules and registers them globally
if (typeof module !== "undefined" && typeof require !== "undefined") {
    const mathObjects = require("./math-objects.js");
    const registry = require("./registry.js");
    const laAlgorithms = require("./la-algorithms.js");
    const parser = require("./parser.js");
    const evaluator = require("./evaluator.js");
    
    // Assign everything to global to mimic browser script load behavior
    Object.assign(global, mathObjects, registry, laAlgorithms, parser, evaluator);
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

// Global exposure for browser environment
if (typeof window !== "undefined") {
    window.calculate = calculate;
}

// Node exposure for Jest tests
if (typeof module !== "undefined") {
    module.exports = {
        calculate,
        Complex: typeof Complex !== "undefined" ? Complex : undefined,
        Matrix: typeof Matrix !== "undefined" ? Matrix : undefined,
        ENV: typeof ENV !== "undefined" ? ENV : undefined,
        astToLaTeX: typeof astToLaTeX !== "undefined" ? astToLaTeX : undefined
    };
}
