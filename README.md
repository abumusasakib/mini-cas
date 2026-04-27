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
2. **Open `index.html`**: Simply open the file in any modern browser to start calculating.

## 🧪 Testing

The project utilizes a dual-layer testing strategy:

1.  **Jest Unit Tests**: Validates the core CAS engine, symbolic math, and linear algebra algorithms.
    ```bash
    npm test
    ```

2.  **Playwright E2E Tests**: Validates the full user journey, UI layout stability, and KaTeX rendering correctness.
    ```bash
    npm run test:ui
    ```

## 🛠 Architecture Overview

The system follows a classic compiler-inspired pipeline:

1.  **Tokenizer**: Converts raw text into tokens, inserting implicit `*` operators where needed.
2.  **Parser**: A recursive descent parser that builds an AST while respecting operator precedence.
3.  **Evaluator**: Traverses the AST to compute results, recording "Reasoning Trace" logs along the way.
4.  **Dispatcher (`Un`)**: The core math kernel that handles polymorphism (e.g., adding two numbers vs. adding two complex objects).
5.  **LaTeX Engine**: Recursively converts the AST into KaTeX-compatible math notation for high-fidelity rendering.

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
| `rref([[1,2,3],[4,5,6]])` | Reduced Row Echelon Form | `[[1,0,-1],[0,1,2]]` |
| `lu([[1,2],[3,4]])` | LU Factorization | `L=..., U=...` |
| `qr([[1,2],[3,4]])` | QR Decomposition | `Q=..., R=...` |
| `eig([[1,2],[3,4]])` | Eigenvalues/vectors | `Eigenvalues: [...], Eigenvectors: [...]` |

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
