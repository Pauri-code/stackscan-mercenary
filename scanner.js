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
    const responseHeaders = {};

    page.on('request', request => { networkRequests.push(request.url()); });
    page.on('response', response => {
        if (response.url() === url || response.url() === url + '/') {
            Object.assign(responseHeaders, response.headers());
        }
    });

    let payload = { url, html: '', responseHeaders: {}, windowVars: [], networkRequests: [], error: null };

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
            html: html.substring(0, 150000),
            responseHeaders,
            windowVars,
            networkRequests: networkRequests.slice(0, 200)
        };
    } catch (e) {
        console.error("Fallo en el escaneo:", e);
        payload.error = e.message;
    } finally {
        await browser.close();
    }

    let retries = 3;
    while (retries > 0) {
        try {
            await fetch(callbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            break;
        } catch (e) {
            retries--;
            if (retries === 0) console.error('Callback failed after 3 retries:', e.message);
            else await new Promise(r => setTimeout(r, 3000));
        }
    }
})();
