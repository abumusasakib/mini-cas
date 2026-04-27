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
            katex.render(inputLatex + " =", document.getElementById('input-math'), {
                throwOnError: false,
                displayMode: true
            });
        }
        if (resultLatex) {
            katex.render(resultLatex, document.getElementById('result-math'), {
                throwOnError: false,
                displayMode: true
            });
        }
        // Handle trace
        if (trace && trace.length > 0) {
            traceContainer.style.display = 'block';
            traceList.innerHTML = trace.map(step => `
                <div class="trace-item">
                    ${step.replace(/Variable|Assign|Operation|Function|Lookup/g, match => `<span>${match}</span>`)}
                </div>
            `).join('');
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
