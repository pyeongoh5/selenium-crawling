import { Crawler, DriverManager, CommandParser, CrawlerType, CrawlerFactory } from 'src/internals';

export default class CrawlerManager {
	baseUrl: string;
	overviews; // 기본 주소로부터 정보를 얻을 수 있는 페이지
	shopInfos; // shop 주소로부터 정보를 얻을 수 있는 페이지
	driverManager: DriverManager;
	crawler: Crawler;

	constructor(url: string, _driverCount: number) {
		this.baseUrl = url;
		this.driverManager = new DriverManager();
		this.driverManager.createDrivers(_driverCount);
		this.overviews = [];
		this.shopInfos = [];
		const parser = new CommandParser();
		const { type } = parser.parse();
		this.crawler = CrawlerFactory.createCrawler(type as CrawlerType);
	}
}
