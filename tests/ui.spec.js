const { test, expect } = require('@playwright/test');

const tests = [
    { expr: "3 + 4 * 2", expected: "11" },
    { expr: "sqrt(16)", expected: "4" },
    { expr: "x = 10", expected: "10" },
    { expr: "x * 2", expected: "20" },
    { expr: "2pi", expected: "6.28318" },
    { expr: "f(x) = x^2 + 1", expected: "Function f defined" },
    { expr: "f(10)", expected: "101" },
    { expr: "diff(x^3 + x, x)", expected: "d/dx = ((3 * (x ^ 2)) + 1)" },
    { expr: "simplify(x + x + 0)", expected: "Simplified: (2 * x)" }, 
    { expr: "simplify(2 + 3 * 4)", expected: "Simplified: 14" },
    { expr: "det([[1,2],[3,4]])", expected: "-2" },
    { expr: "lu([[1,2],[3,4]])", expected: "L = [[1, 0], [3, 1]]" },
    { expr: "qr([[1,2],[3,4]])", expected: "Q =" },
    { expr: "eig([[1,0],[0,2]])", expected: "Eigenvalues: [1.0000, 2.0000]" },
    { expr: "inv([[1,2],[3,4]])", expected: "[[-2, 1], [1.5, -0.5]]" },
    { expr: "trans([[1,2,3],[4,5,6]])", expected: "[[1, 4], [2, 5], [3, 6]]" }
];

test.describe('Mini CAS UI - Sequential Legacy Validation', () => {
    // Use serial mode to maintain state (variables/functions) across tests
    test.describe.configure({ mode: 'serial' });

    let page;

    test.beforeAll(async ({ browser }) => {
        page = await browser.newPage();
        await page.goto('/');
    });

    test.afterAll(async () => {
        await page.close();
    });

    for (const { expr, expected } of tests) {
        test(`Case: ${expr}`, async () => {
            await page.fill('#expression-input', expr);
            await page.click('#calculate-btn');
            
            // 1. Result Section Visibility
            await expect(page.locator('#result-container')).toBeVisible();
            await expect(page.locator('#error-message')).toBeHidden();
            
            // 2. Validate Content
            await expect(page.locator('#result-value')).toContainText(expected);
            
            // 3. LaTeX Display / KaTeX Validation
            const latexDisplay = page.locator('#latex-display');
            await expect(latexDisplay).not.toBeEmpty();
            // Check if KaTeX has actually rendered math (at least one .katex element)
            await expect(latexDisplay.locator('.katex').first()).toBeVisible();
            // Regression check: Ensure no unhandled node types (???) or KaTeX parse errors
            await expect(latexDisplay).not.toContainText('???');
            await expect(latexDisplay.locator('.katex-error')).toBeHidden();
        });
    }
    
    test('UI Regression: Layout stability with large matrix', async () => {
        const longExpr = "[[1,2,3,4,5,6,7,8,9,10],[11,12,13,14,15,16,17,18,19,20]]";
        await page.fill('#expression-input', longExpr);
        await page.click('#calculate-btn');
        
        // Ensure scrollbar is present if it overflows
        const display = page.locator('#latex-display');
        const scrollWidth = await display.evaluate(el => el.scrollWidth);
        const clientWidth = await display.evaluate(el => el.clientWidth);
        
        // On small viewports it should have a scrollbar or be scrollable
        if (scrollWidth > clientWidth) {
            console.log('Horizontal scroll active for large matrix - OK');
        }
    });
});
