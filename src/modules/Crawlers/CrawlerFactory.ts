console.log('CrawlerFactory');
import { CrawlerType } from 'src/enums';
import { Crawler, ITownCrawler } from 'src/modules/Crawlers';

export class CrawlerFactory {
	static createCrawler(crawlerType: CrawlerType): Crawler {
		switch (crawlerType) {
			case CrawlerType.I_TOWN_PAGE:
				return new ITownCrawler();
		}
	}
}
