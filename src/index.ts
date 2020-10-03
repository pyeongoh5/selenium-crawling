import { CrawlerFactory, CommandParser } from 'src/modules';
import { isValidCrawlerType } from 'src/utils';

import { ITownUtils } from 'src/modules/ITownUtils';

const commandParser = new CommandParser();
const { type: crawlingType, area, row } = commandParser.parse();

console.log('arguments', crawlingType, area, row);

if (!isValidCrawlerType(crawlingType)) {
	console.error(`${crawlingType} is not valid type!!!`);
	process.exit();
}

const crawler = CrawlerFactory.createCrawler(crawlingType);
// crawler.prepareDriver(crawlerCount)
// crawler.prepareDriver(1);
crawler.run(area, row);
