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
    page.on('request', request => { networkRequests.push(request.url()); });
    
    let payload = { url, html: '', windowVars: [], networkRequests: [], error: null };
    
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
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
        payload = {
            url,
            html: html.substring(0, 50000),
            windowVars,
            networkRequests: networkRequests.slice(0, 200)
        };
    } catch (e) {
        console.error("Fallo en el escaneo:", e);
        payload.error = e.message;
    } finally {
        await browser.close();
    }
    
    // Siempre llama al callback, incluso si hubo error
    await fetch(callbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
})();
