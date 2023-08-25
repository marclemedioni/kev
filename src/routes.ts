import { Dataset, createPlaywrightRouter } from 'crawlee';
import _ from 'lodash';
import extractDomain from 'extract-domain';

export const router = createPlaywrightRouter({});

router.addDefaultHandler(async ({ enqueueLinks, log, request }) => {
  log.info(`enqueueing new URLs`);
  await enqueueLinks({
    regexps: [
      /cgv-cgu/,
      /mentions/,
      /notice/,
      /policies/,
      /legal-notice/,
      /mentions-legales/,
      /nous-contacter/,
      /mention/,
      /legales/,
      /legale/,
      /about/,
      /contact/,
      /policies/,
      /legal-notice/,
      /contactez-nous/,
      /2-mentions-legales/,
      /conditions/,
      /condition-generale-vente/,
      /cgv/,
      /legal/,
    ],
    exclude: [/mailto\:/],
    label: 'detail',
  });
});

router.addHandler('detail', async ({ request, page, log }) => {
  const emailPattern =
    /\b[A-Za-z0-9._%+-]+(?:@(?!\d*x)|\[at\])[A-Za-z0-9.-]+(?:\.|\[dot\])[A-Za-z]{2,}\b/gm;

  // Weak detection of adult consent for woocommerce sites
  let consentButtons = await page.getByRole('button', {
    name: /oui/i,
  });

  if ((await consentButtons.count()) > 0) {
    await consentButtons.first().click();
  }

  const pageContent = await page.content();

  let emails = pageContent.match(emailPattern) || [];

  await Dataset.pushData({
    siteUrl: request.loadedUrl,
    emails,
  });
});
