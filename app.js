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

// Initialize trace display and render static math
document.addEventListener('DOMContentLoaded', () => {
    traceList.style.display = 'block';
    
    // Render static math in guide section with a small delay to ensure KaTeX is ready
    setTimeout(() => {
        if (window.renderMathInElement) {
            window.renderMathInElement(document.body, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\(', right: '\\)', display: false},
                    {left: '\\[', right: '\\]', display: true}
                ],
                throwOnError : false
            });
        }
    }, 100);

    // Initialize Visualizer
    initVisualizer();
});

/**
 * Linear Transformation Visualizer Logic
 */
function initVisualizer() {
    const canvas = document.getElementById('transformation-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const transformType = document.getElementById('transform-type');
    const transformSlider = document.getElementById('transform-slider');
    const paramDisplay = document.getElementById('param-display');
    const matrixDisplay = document.getElementById('visualizer-matrix-display');

    function drawGrid(matrix = [[1, 0], [0, 1]]) {
        const width = canvas.width;
        const height = canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const step = 40; // Pixels per unit

        ctx.clearRect(0, 0, width, height);
        
        // Draw original light grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = -width; x <= width; x += step) {
            ctx.beginPath();
            ctx.moveTo(centerX + x, 0); ctx.lineTo(centerX + x, height);
            ctx.stroke();
        }
        for (let y = -height; y <= height; y += step) {
            ctx.beginPath();
            ctx.moveTo(0, centerY + y); ctx.lineTo(width, centerY + y);
            ctx.stroke();
        }

        // Draw transformed grid
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = 1;
        
        // Matrix columns represent transformed basis vectors
        const i_hat = [matrix[0][0], matrix[1][0]];
        const j_hat = [matrix[0][1], matrix[1][1]];
        
        for (let i = -10; i <= 10; i++) {
            // Vertical lines
            ctx.beginPath();
            ctx.moveTo(centerX + (i * i_hat[0] + (-10) * j_hat[0]) * step, centerY - (i * i_hat[1] + (-10) * j_hat[1]) * step);
            ctx.lineTo(centerX + (i * i_hat[0] + (10) * j_hat[0]) * step, centerY - (i * i_hat[1] + (10) * j_hat[1]) * step);
            ctx.stroke();
            
            // Horizontal lines
            ctx.beginPath();
            ctx.moveTo(centerX + ((-10) * i_hat[0] + i * j_hat[0]) * step, centerY - ((-10) * i_hat[1] + i * j_hat[1]) * step);
            ctx.lineTo(centerX + ((10) * i_hat[0] + i * j_hat[0]) * step, centerY - ((10) * i_hat[1] + i * j_hat[1]) * step);
            ctx.stroke();
        }

        // Draw Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, centerY); ctx.lineTo(width, centerY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height); ctx.stroke();

        // Draw Basis Vectors
        const drawVector = (v, color, label) => {
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 3;
            const targetX = centerX + v[0] * step;
            const targetY = centerY - v[1] * step;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(targetX, targetY);
            ctx.stroke();

            // Simple arrowhead
            const angle = Math.atan2(-v[1], v[0]);
            ctx.beginPath();
            ctx.moveTo(targetX, targetY);
            ctx.lineTo(targetX - 10 * Math.cos(angle - Math.PI/6), targetY - 10 * Math.sin(angle - Math.PI/6));
            ctx.lineTo(targetX - 10 * Math.cos(angle + Math.PI/6), targetY - 10 * Math.sin(angle + Math.PI/6));
            ctx.fill();
        };
        
        drawVector(i_hat, '#38bdf8', 'i');
        drawVector(j_hat, '#f472b6', 'j');
    }

    function updateVisualizer() {
        const type = transformType.value;
        const val = parseFloat(transformSlider.value);
        paramDisplay.textContent = val.toFixed(1);
        
        const matrixObj = getTransformationMatrix(type, val);
        
        // Render Matrix in display using KaTeX
        matrixDisplay.innerHTML = `$$T = ${astToLaTeX({ type: 'Number', value: matrixObj })}$$`;
        if (window.renderMathInElement) {
            renderMathInElement(matrixDisplay, { delimiters: [{left: '$$', right: '$$', display: true}] });
        }
        
        drawGrid(matrixObj.data);
    }

    transformSlider.addEventListener('input', updateVisualizer);
    transformType.addEventListener('change', () => {
        // Reset slider based on type
        if (transformType.value === 'scale') {
            transformSlider.min = 0; transformSlider.max = 3; transformSlider.value = 1.5;
        } else if (['projection', 'reflection'].includes(transformType.value)) {
            transformSlider.min = 0; transformSlider.max = 180; transformSlider.value = 45;
        } else if (transformType.value.startsWith('shear')) {
            transformSlider.min = -2; transformSlider.max = 2; transformSlider.value = 1;
        }
        updateVisualizer();
    });

    updateVisualizer();
}
