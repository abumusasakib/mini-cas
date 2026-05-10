/**
 * UI Logic for Mini CAS Web App
 */

const input = document.getElementById('expression-input');
const calcBtn = document.getElementById('calculate-btn');
const resultContainer = document.getElementById('result-container');
const resultValue = document.getElementById('result-value');
const errorMessage = document.getElementById('error-message');
const traceContainer = document.getElementById('trace-container');
const traceList = document.getElementById('trace-list');

function setInput(val) {
    input.value = val;
    input.focus();
}

function toggleTrace() {
    const list = document.getElementById('trace-list');
    const title = document.querySelector('.trace-title svg');
    if (list.style.display === 'none') {
        list.style.display = 'block';
        title.style.transform = 'rotate(0deg)';
    } else {
        list.style.display = 'none';
        title.style.transform = 'rotate(180deg)';
    }
}

function handleCalculate() {
    const expr = input.value.trim();
    if (!expr) return;

    const { result, inputLatex, resultLatex, trace, error } = calculate(expr);

    // Show result container
    resultContainer.style.display = 'block';

    if (error) {
        resultValue.textContent = '';
        errorMessage.textContent = `Error: ${error}`;
        traceContainer.style.display = 'none';
        document.getElementById('latex-display').innerHTML = '';
    } else {
        errorMessage.textContent = '';
        resultValue.textContent = result;
        
        // Render LaTeX
        const display = document.getElementById('latex-display');
        display.innerHTML = '<div id="input-math"></div><div id="result-math"></div>';
        
        if (inputLatex) {
            try {
                katex.render(inputLatex + " =", document.getElementById('input-math'), {
                    throwOnError: false
                });
            } catch (e) {
                console.error("KaTeX Input Render Error:", e);
                document.getElementById('input-math').textContent = inputLatex + " =";
            }
        }
        if (resultLatex) {
            try {
                katex.render(resultLatex, document.getElementById('result-math'), {
                    throwOnError: false
                });
            } catch (e) {
                console.error("KaTeX Result Render Error:", e);
                document.getElementById('result-math').textContent = resultLatex;
            }
        }
        // Handle trace
        if (trace && trace.length > 0) {
            traceContainer.style.display = 'block';
            traceList.innerHTML = trace.map(step => {
                let s = step;
                s = s.replace(/Rule:/g, '<span class="trace-tag rule">Rule</span>');
                s = s.replace(/Step:/g, '<span class="trace-tag step">Step</span>');
                s = s.replace(/Algo:/g, '<span class="trace-tag algo">Algo</span>');
                s = s.replace(/Pivot:/g, '<span class="trace-tag pivot">Pivot</span>');
                s = s.replace(/Variable/g, '<span class="trace-tag var">Variable</span>');
                s = s.replace(/Assign/g, '<span class="trace-tag assign">Assign</span>');
                s = s.replace(/Operation/g, '<span class="trace-tag op">Operation</span>');
                s = s.replace(/Function/g, '<span class="trace-tag func">Function</span>');
                s = s.replace(/Lookup/g, '<span class="trace-tag lookup">Lookup</span>');
                return `<div class="trace-item">${s}</div>`;
            }).join('');
        } else {
            traceContainer.style.display = 'none';
        }
    }

    // Add animation
    resultContainer.style.animation = 'none';
    resultContainer.offsetHeight; // trigger reflow
    resultContainer.style.animation = 'fadeIn 0.5s ease-out';
}

calcBtn.addEventListener('click', handleCalculate);

input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleCalculate();
    }
});

// Initialize trace display
document.addEventListener('DOMContentLoaded', () => {
    traceList.style.display = 'block';
});
