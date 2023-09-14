import { Dataset, PlaywrightCrawler } from 'crawlee';
import _ from 'lodash';
import axios from 'axios';
import extractDomain from 'extract-domain';
import fs from 'fs';
import csv from 'fast-csv';

import { router } from './routes.js';

import config from '../../config.json' assert { type: 'json' };
import startUrls from '../../input/scrapper.json' assert { type: 'json' };

const now = new Date();
const filename = `output/scrapper_${now.getDate()}-${now.getMonth()}-${now.getFullYear()} ${now.getHours()}-${now.getMinutes()}.csv`;

const csvStream = csv.format({ headers: true });
const writeStream = fs.createWriteStream(filename);

csvStream.pipe(writeStream);

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

const resultPatern: {
  siteUrl: string | null;
  bestEmail: string | null;
  allEmails: string[];
} = {
  siteUrl: null,
  bestEmail: null,
  allEmails: [],
};
const results: { [key: string]: typeof resultPatern } = {};

const dataset = await Dataset.open('default');

await dataset.forEach(async (item) => {
  const domain = extractDomain(item.siteUrl) as string;

  results[domain] = results[domain]
    ? results[domain]
    : Object.assign({}, resultPatern);

  const resultObject = results[domain];

  resultObject.allEmails = [
    ...resultObject.allEmails,
    ...item.emails,
  ];

  resultObject.siteUrl = new URL(item.siteUrl).hostname;
});

for (const [key, item] of Object.entries(results)) {
  item.allEmails = _.filter(
    item.allEmails,
    (email: string) => email.search('sentry') === -1
  );
  item.allEmails = _.uniq(item.allEmails);

  item.bestEmail =
    item.allEmails.reduce((memo, email) => {
      if (memo) {
        return memo;
      }

      return email.search(key) > -1
        ? email
        : email.search(/gmail|contact@/) > -1
        ? email
        : '';
    }, '') ||
    (_.head(
      _(item.allEmails).countBy().entries().maxBy(_.last)
    ) as string);

  let csvResult: {
    domain: string;
    contactEmail: string | undefined;
    emails: string[];
    estimatedTraffic?: number;
    estimatedKeywords?: number;
    competitorUrl?: string;
    competitorEstimatedTraffic?: number;
    competitorKeywords?: number;
  } = {
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
          search: item.siteUrl,
          limit: 1,
          sortby: 'Desc_Date',
        },
      });

      competitor = await axios.get(
        'https://api.ranxplorer.com/v1/seo/competitors',
        {
          params: {
            search: item.siteUrl,
            limit: 1,
          },
        }
      );

      if (seo.data.errors) {
        console.error(
          `Impossible de récupérer les données SEO: ${seo.data.message}`
        );
      }

      if (competitor.data.errors) {
        console.error(
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
    } catch (error) {
      console.error(error);
    }

    csvStream.write(csvResult);
  }
}

csvStream.end();
