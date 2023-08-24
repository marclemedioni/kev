// For more information, see https://crawlee.dev/
import {
  Configuration,
  Dataset,
  PlaywrightCrawler,
  ProxyConfiguration,
} from 'crawlee';
import log from '@apify/log';
import _ from 'lodash';
import axios from 'axios';
import extractDomain from 'extract-domain';
import fs from 'fs';
import csv from 'fast-csv';

import { router } from './routes.js';

import config from '../config.json' assert { type: 'json' };
import startUrls from '../input.json' assert { type: 'json' };

const now = new Date();
const filename = `${now.getDate()}-${now.getMonth()}-${now.getFullYear()} ${now.getHours()}-${now.getMinutes()}_output.csv`;

const csvStream = csv.format({ headers: true });
const writeStream = fs.createWriteStream(filename);
csvStream.pipe(writeStream);

// Set the 'persistStateIntervalMillis' option
// of global configuration to 10 seconds
Configuration.getGlobalConfig().set('headless', false);

axios.defaults.headers.common['X-Ranxplorer-Token'] =
  config.ranxplorerToken;

const crawler = new PlaywrightCrawler({
  // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
  requestHandler: router,
  preNavigationHooks: [
    async (crawlingContext, gotoOptions) => {
      const { page } = crawlingContext;

      await page.route('**/*', (route) => {
        return ['image', 'font', 'fetch'].includes(
          route.request().resourceType()
        )
          ? route.abort()
          : route.continue();
      });
    },
  ],
});

await crawler.run(startUrls);

const results = {};
const resultPatern = {
  bestEmail: null,
  allEmails: [],
};

const dataset = await Dataset.open('default');

await dataset.forEach(async (item) => {
  results[item.domain] = results[item.domain]
    ? results[item.domain]
    : Object.assign({}, resultPatern);

  const resultObject = results[item.domain];

  resultObject.allEmails = [
    ...resultObject.allEmails,
    ...item.emails,
  ];
});

for (const [key, item] of Object.entries(results)) {
  item.allEmails = _.filter(
    item.allEmails,
    (email) => email.search('sentry') === -1
  );
  item.allEmails = _.uniq(item.allEmails);

  item.bestEmail =
    item.allEmails.reduce((memo, email) => {
      if (memo) {
        return memo;
      }

      return email.search(key) > -1
        ? email
        : email.search(/gmail|contact\@/) > -1
        ? email
        : null;
    }, null) ||
    _.head(_(item.allEmails).countBy().entries().maxBy(_.last));

  let csvResult = {
    domain: key,
    contactEmail: item.bestEmail
      ?.replace('[at]', '@')
      .replace('[dot]', '.'),
    emails: item.allEmails?.map((email) =>
      email.replace('[at]', '@').replace('[dot]', '.')
    ),
  };

  if (config.ranxplorerToken) {
    let seo;
    let competitor;

    try {
      seo = await axios.get('https://api.ranxplorer.com/v1/seo', {
        params: {
          search: key,
          limit: 1,
          sortby: 'Desc_Date',
        },
      });

      competitor = await axios.get(
        'https://api.ranxplorer.com/v1/seo/competitors',
        {
          params: {
            search: key,
            limit: 1,
          },
        }
      );

      if (seo.data.errors) {
        log.error(
          `Impossible de récupérer les données SEO: ${seo.data.message}`
        );
      }

      if (competitor.data.errors) {
        log.error(
          `Impossible de récupérer les données compétiteur: ${competitor.data.message}`
        );
      }

      csvResult = {
        ...csvResult,
        estimatedTraffic:
          seo.data.data && seo.data.data[0] && seo.data.data[0].Est,
        estimatedKeywords:
          seo.data.data && seo.data.data[0] && seo.data.data[0].Nbkw,
        competitorUrl:
          competitor.data.data &&
          competitor.data.data[0] &&
          extractDomain(competitor.data.data[0].Conc),
        competitorEstimatedTraffic:
          competitor.data.data &&
          competitor.data.data[0] &&
          competitor.data.data[0].Est,
        competitorKeywords:
          competitor.data.data &&
          competitor.data.data[0] &&
          competitor.data.data[0].Nbkw,
      };
    } catch (e) {
      console.error(e);
    }

    csvStream.write(csvResult);
  }
}

csvStream.end();
