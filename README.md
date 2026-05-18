# Mini CAS | Symbolic Math Engine & Web App

[![Deploy to GitHub Pages](https://github.com/actions/browser/actions/workflows/static.yml/badge.svg)](https://pages.github.com/)

A lightweight, powerful **Computer Algebra System (CAS)** engine and interactive web application. Built with a focus on functional dispatcher patterns, symbolic differentiation, and explainable AI (XAI) traces.

## ✨ Features

- **🧠 Symbolic Engine**: A custom-built math kernel utilizing a recursive descent parser and AST (Abstract Syntax Tree) generation.
- **⚡ Dynamic Dispatch**: Uses a unified dispatcher (`Un`) to route operations based on arity and type (Scalar, Complex, Matrix).
- **📝 Implicit Multiplication**: Intelligently handles expressions like `2pi`, `2x`, or `(x+1)(x-1)`.
- **📐 Symbolic Differentiation**: Computes derivatives of expressions using standard calculus rules (Product rule, Power rule).
- **🔍 XAI Reasoning Trace**: Transparently logs every step of the calculation, from tokenization to final result.
- **🎨 Premium UI**: A modern, glassmorphic dark-mode interface designed for a seamless user experience.
- **🧪 Robust Testing**: High-coverage test suites including Jest unit tests and Playwright E2E visual validation.
- **🚀 One-Click Deployment**: Fully static architecture, optimized for instant hosting on GitHub Pages via GitHub Actions.

## 🚀 Quick Start

1. **Clone the repo**:

   ```bash
   git clone https://github.com/your-username/mini-cas.git
   ```

2. **Run locally**:
   You can simply open `index.html` in any modern browser, or use a local development server:

   ```bash
   # Option 1: Using the npm script
   npm run serve

   # Option 2: Using npx directly (port 8084, no-cache)
   npx http-server . -p 8084 -c-1
   ```

## 🧪 Testing

The project utilizes a dual-layer testing strategy:

1. **Jest Unit Tests**: Validates the core CAS engine, symbolic math, and linear algebra algorithms.

    ```bash
    npm test
    ```

2. **Playwright E2E Tests**: Validates the full user journey, UI layout stability, and KaTeX rendering correctness.

    ```bash
    npm run test:ui
    ```

## 🛠️ Architecture & Modular Components

The CAS mathematical engine is modularized into **6 decoupled components** utilizing the **Registry Pattern** to ensure extreme maintainability, clean separation of concerns, and unified browser and Node/Jest testing execution:

```
                  ┌───────────────────────────────┐
                  │            cas.js             │
                  │   Orchestrator & Node Loader  │
                  └───────┬───────────────┬───────┘
                          │               │
                          ▼               ▼
                  ┌───────────────┐ ┌───────────────┐
                  │   parser.js   │ │  evaluator.js │
                  │ Token & Parse │ │ AST Evaluator │
                  └───────┬───────┘ └───────┬───────┘
                          │   ┌─────────────┘
                          ▼   ▼
                  ┌───────────────┐ ┌───────────────┐
                  │  registry.js  │ │la-algorithms.js│
                  │  Registries   │ │Matrix Kernels │
                  └───────────────┘ └───────┬───────┘
                                            │
                                            ▼
                                    ┌───────────────┐
                                    │math-objects.js│
                                    │Complex/Matrix │
                                    └───────────────┘
```

### 1. [math-objects.js](math-objects.js)

Declares the algebraic foundation classes:
- `Complex` (Real and imaginary number support).
- `Matrix` (Custom multi-dimensional matrix objects).
- `transpose` helper and numerical precision constants (`EPSILON`).

### 2. [registry.js](registry.js)

Defines the base directory Registries that decouple the arities and operations from giant switches:
- `OpRegistry` - Registers binary and unary mathematical symbols (e.g. `+`, `-`, `*`, `/`, `^`).
- `FunctionRegistry` - Registers linear algebra and core functions (e.g. `det`, `eig`, `rref`, `sin`).
- `LaTeXRegistry` - Registers AST-to-LaTeX converter rules dynamically.

### 3. [la-algorithms.js](la-algorithms.js)

Houses all mathematical linear algebra kernels:
- Decompositions: Doolittle LU, Gram-Schmidt QR.
- Row Reductions: Reduced Row Echelon Form (RREF), REF.
- Subspaces: Row space, Column space, Null space, and Matrix rank.
- Transforms: Projection, Shearing, Reflection, and Scalings.
- Solvers: QR Eigenvalues and inverse solvers.
- Vector Operations: Norm, normalization (unit vector), dot product, 3D cross product, and angle calculations.
- Machine Learning Suite: Analytical least-squares Normal Equation solver, MinMax and Z-Score feature scaling, element-wise Sigmoid activation, Softmax regression activation, Binary Cross-Entropy (BCE) loss, single-step Gradient Descent (linear & logistic updates), and evaluation metrics (MAE, MSE, RMSE, R-squared, MAPE, Confusion Matrix, Accuracy, Precision, Recall, Specificity, F1-Score).


### 4. [parser.js](parser.js)

Encapsulates expression parsing:
- `tokenize` & `insertImplicit` (for handling constructs like `2pi`).
- `parse` (A recursive descent parser that builds an AST with correct operator precedence).
- `astToString` serializer.

### 5. [evaluator.js](parser.js)

Executes AST traversal, registers all functions into the directories, and handles:
- `evaluate` (using the unified `opRegistry` and `functionRegistry` dispatchers).
- `simplify` (constant folding and term simplification rules).
- `differentiate` (symbolic differentiation rules).

### 6. [cas.js](cas.js)

The high-level orchestrator:
- Exposes `calculate(expr)` matching the original unified signature.
- Resolves namespace binding for Node.js: automatically loads and binds sub-modules to Node's `global` context when required in Jest.

---

## 🧩 The Registry Pattern

Instead of hardcoded case-switching, mathematical logic is dynamically looked up and executed via custom registries. Adding a new function is as simple as registering a handler:

```javascript
// Register a custom function
functionRegistry.register("sin", (args) => Math.sin(args[0]));

// Perform evaluation dispatch
const handler = functionRegistry.get(node.name);
if (handler) return handler(args, trace);
```

## 🧪 Examples

| Input | Description | Result |
| :--- | :--- | :--- |
| `sqrt(16) + 3 * (2+1)` | Basic arithmetic with precedence | `13` |
| `2pi` | Implicit multiplication | `6.28318...` |
| `x = 5` | Variable assignment | `5` |
| `f(x) = x^2 + 1` | User-defined functions | `Function f defined` |
| `diff(x^3, x)` | Symbolic differentiation | `d/dx = 3x^2` |
| `simplify(x+x+0)` | Symbolic simplification | `Simplified: (2 * x)` |
| `det([[1,2],[3,4]])` | Matrix Determinant | `-2` |
| `inv([[1,2],[3,4]])` | Matrix Inverse | `[[-2, 1], [1.5, -0.5]]` |
| `trans([[1,2,3],[4,5,6]])` | Matrix Transpose | `[[1, 4], [2, 5], [3, 6]]` |
| `[[1,2],[3,4]]^3` | Matrix Exponentiation | `[[37, 54], [81, 118]]` |
| `rref([[1,2,3],[4,5,6]])` | Reduced Row Echelon Form | `[[1,0,-1],[0,1,2]]` |
| `lu([[1,2],[3,4]])` | LU Factorization | `L=..., U=...` |
| `qr([[1,2],[3,4]])` | QR Decomposition | `Q=..., R=...` |
| `eig([[1,2],[3,4]])` | Eigenvalues/vectors | `Eigenvalues: [...], Eigenvectors: [...]` |
| `norm([3,4])` | Vector Euclidean Norm | `5` |
| `unit([3,4])` | Vector Normalization | `[[0.6, 0.8]]` |
| `dot([1,2],[3,4])` | Dot Product | `11` |
| `cross([1,0,0],[0,1,0])` | 3D Cross Product | `[[0, 0, 1]]` |
| `angle([1,0],[0,1])` | Angle Between Vectors | `1.57079... (rad)` |
| `angle([1,0],[0,1], deg)` | Angle Between Vectors (Degrees) | `90` |
| `sin(90, deg)` | Trig Function in Degrees | `1` |
| `transform(projection, 45, deg)` | Linear Transform in Degrees | `[[0.5, 0.5], [0.5, 0.5]]` |
| `normal_eq([[1,1],[1,2],[1,3]], [[1],[3],[3]])` | Analytical linear regression Normal Equation | `[[0.3333], [1.0000]]` |
| `sigmoid([[0,2]])` | Element-wise Sigmoid activation mapping | `[[0.5, 0.8808]]` |
| `softmax([[1,2,3]])` | Row-wise Softmax probability normalization | `[[0.0900, 0.2447, 0.6652]]` |
| `minmax_scale([[10],[20],[30]])` | Feature scaling using min-max mapping to [0,1] | `[[0], [0.5], [1]]` |
| `zscore_scale([[10],[20],[30]])` | Feature scaling to zero-mean and unit-variance | `[[-1.2247], [0], [1.2247]]` |
| `regression_metrics([[2],[4]], [[1],[5]])` | Regression quality MAE, MSE, RMSE, R-squared, MAPE | `MAE = 1.0000, MSE = 1.0000, RMSE = 1.0000, R2 = 0.7500, MAPE = 60.00%` |
| `confusion_matrix([[0.9],[0.1],[0.8],[0.2]], [[1],[0],[1],[1]])` | Classification performance Confusion Matrix | `[[2, 1], [0, 1]]` |
| `classification_metrics([[0.9],[0.1],[0.8],[0.2]], [[1],[0],[1],[1]])` | Accuracy, Precision, Recall, Specificity, F1-score | `Accuracy = 75.00%, Precision = 100.00%, Recall = 66.67%, Specificity = 100.00%, F1-Score = 80.00%` |
| `gradient_descent([[1,100],[1,150]], [[15],[20]], [[5],[0.1]], 0.05, linear)` | Single-step vectorized gradient descent update | `[[5.0000], [0.1000]]` |
| `binary_cross_entropy([[0.5],[0.5]], [[1],[0]])` | Binary Cross-Entropy log loss mapping | `0.6931...` |



## 🛠 Tech Stack

- **Core**: Vanilla JavaScript (ES6+)
- **Styling**: Modern CSS (Glassmorphism, CSS Grid, Flexbox)
- **Math Rendering**: KaTeX
- **Testing**: Jest, Playwright
- **Deployment**: GitHub Pages (via GitHub Actions)

## 🛣 Future Roadmap

- [ ] Support for complex eigenvalues
- [ ] Neural-symbolic hybrid reasoning modules

## 📄 License

MIT License - feel free to use and extend this engine for your own projects!
