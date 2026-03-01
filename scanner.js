const puppeteer = require('puppeteer-core');
(async () => {
    const url = process.env.SCAN_URL;
    const callbackUrl = process.env.CALLBACK_URL;
    const browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    const networkRequests = [];
    page.on('request', request => {
        networkRequests.push(request.url());
    });
    try {
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
        const windowVars = await page.evaluate(() => {
            return Object.keys(window).filter(k => 
                ['React','__NEXT_DATA__','__NUXT__','__vue_app__','Intercom',
                 'Stripe','supabase','posthog','hj','dataLayer','Tawk_API',
                 '__sveltekit_','Landbot','Outseta','MemberStack','Crisp',
                 'tidioChatApi','zE','klaviyo','_learnq','plausible','fathom',
                 'clarity','HubSpotConversations','Webflow'].includes(k)
            );
        });
        const html = await page.content();
        const payload = {
            url,
            html: html.substring(0, 50000),
            windowVars,
            networkRequests: networkRequests.slice(0, 200)
        };
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
