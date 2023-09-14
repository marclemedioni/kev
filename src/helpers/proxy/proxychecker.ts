import { ChromiumBrowser, chromium } from 'playwright';
import pLimit from 'p-limit';
import { CheckConfig, Proxy, ProxyList } from './model.js';
import bluebird from 'bluebird';

const { Promise } = bluebird;

const limit = pLimit(10);

// Check all proxies
export async function checkAllProxies(
  proxyList: ProxyList,
  config: CheckConfig
) {
  const browser = await chromium.launch({
    headless: true,
  });
  const promises = proxyList
    .getProxies()
    .map((proxy) => limit(() => checkProxy(proxy, config, browser)));

  console.log(`Trying to get 10 proxies before crawling...`);

  await Promise.some(promises, 10);
  await browser.close();
}

// Try to make a request with the proxy
export async function checkProxy(
  proxy: Proxy,
  config: CheckConfig,
  browser: ChromiumBrowser
) {
  try {
    const context = await browser.newContext({
      proxy: {
        server: proxy.getUrl(),
      },
    });
    const page = await context.newPage();

    const response = await page.goto(
      'https://www.google.com/search?q=tests'
    );

    if (response && !response.ok()) {
      proxy.valid = false;

      throw new Error(
        `Check Proxy - Invalid status code for request through the proxy : ${proxy.getUrl()} : ${response.status()}`
      );
    }

    console.log(
      `Check Proxy - valid proxy request to Google : ${proxy.getUrl()}`
    );
    proxy.valid = true;
  } catch (e) {
    proxy.valid = false;
    throw new Error(
      `Check Proxy - Invalid status code for request through the proxy : ${proxy.getUrl()}`
    );
  }
}
