const puppeteer = require('puppeteer-core');

(async () => {
    const url = process.env.SCAN_URL;
    const callbackUrl = process.env.CALLBACK_URL;

    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    // 1. Interceptamos llamadas de red (Para cazar Supabase, Stripe, etc.)
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push(request.url());
    });

    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });

        // 2. Extraemos variables de window reales (Runtime)
        const windowVars = await page.evaluate(() => {
            return {
                isReact: !!window.React || !!document.querySelector('[data-reactroot]'),
                isNext: !!window.__NEXT_DATA__,
                hasStripe: !!window.Stripe,
                // Añade aquí las que quieras trackear
            };
        });

        const html = await page.content();

        // 3. Empaquetamos todo
        const payload = {
            url,
            windowVars,
            requests: networkRequests.filter(r => r.includes('api') || r.includes('js')),
            html_sample: html.substring(0, 1000) // Solo una muestra para no saturar
        };

        // 4. EL RETORNO: Callback a n8n
        await fetch(callbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

    } catch (e) {
        console.error("Fallo en el escaneo:", e);
    } finally {
        await browser.close();
    }
})();
