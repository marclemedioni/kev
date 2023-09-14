import serp from 'serp';
import * as proxyLoader from '../helpers/proxy/proxyfileloader.js';
import { readFile } from 'node:fs/promises';
import extractDomain from 'extract-domain';

const config = proxyLoader
  .config()
  .setProxyFile('./proxies.txt')
  .setCheckProxies(true)
  .setRemoveInvalidProxies(true);

const proxyList = await proxyLoader.loadProxyFile(config);

const sitesToCheck = (await readFile('./input/index-checker.txt'))
  .toString()
  .split('\n')
  .map((site) => extractDomain(site));

for (let site of sitesToCheck) {
  const numberOfResults = await serp.search({
    numberOfResults: true,
    qs: {
      q: `site:${site}`,
    },
    retry: 30,
    delay: 200,
    proxyList: proxyList,
  });

  console.log(site, numberOfResults);
}
