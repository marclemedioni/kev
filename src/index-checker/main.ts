import serp from 'serp';
import axios from 'axios';
import * as proxyLoader from '../helpers/proxy/proxyfileloader.js';
import { readFile, writeFile } from 'node:fs/promises';

const response = await axios.get(
  'https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt'
);

await writeFile('proxies.txt', response.data);

const config = proxyLoader
  .config()
  .setProxyFile('./proxies.txt')
  .setCheckProxies(true)
  .setRemoveInvalidProxies(true);

const proxyList = await proxyLoader.loadProxyFile(config);

const sitesToCheck = (await readFile('./input/index-checker.txt'))
  .toString()
  .split('\n');

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
