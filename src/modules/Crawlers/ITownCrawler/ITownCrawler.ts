import { Crawler } from 'src/modules/Crawlers/Crawler';
import { Driver } from 'src/modules/Driver';
import { CrawlingOption, CrawlerPage, removeDuplicateStringArray } from 'src/internals';
import { ITownUtils } from 'src/modules/ITownUtils';
// import { removeDuplicateStringArray } from 'src/utils/utils';

const By = require('selenium-webdriver').By;

const areaModel = require('./data/area');
const genreModel = require('./data/genre');
const subGenreModel = require('./data/subGenre');

export class ITownCrawler extends Crawler {
	area: CrawlingOption[];
	genre: CrawlingOption[];
	subGenre: CrawlingOption[];
	url: string;
	detailPages: string[];
	utils: ITownUtils;

	constructor();
	constructor(_area: CrawlingOption[]);
	constructor(_area: CrawlingOption[], _genre: CrawlingOption[]);
	constructor(_area: CrawlingOption[], _genre: CrawlingOption[], _subGenre: CrawlingOption[]);
	constructor(_area?: CrawlingOption[], _genre?: CrawlingOption[], _subGenre?: CrawlingOption[]) {
		super();
		this.url = CrawlerPage.I_TOWN_PAGE;
		this.area = _area || areaModel;
		this.genre = _genre || genreModel;
		this.subGenre = _subGenre || subGenreModel;
		this.detailPages = [];

		this.utils = new ITownUtils();
		this.utils.parserInputExcel();
	}

	async run(area?: string, row?: string): Promise<void>;
	async run(area: string, row: string): Promise<void> {
		const params = this.utils.getDataParamsToCrawling(area, row);
		console.log('url', this.utils.getITownPageUrl(params[0]));

		console.log('ITownCrawler run with', params);

		for (let i = 0; i < params.length; ++i) {
			const url = this.utils.getITownPageUrl(params[i]);

			const driver = this.createDriver();
			await driver.get(url);
			await this.spreadAllList(driver);
			const titleList = await (await driver).findElements(
				By.className('m-article-card__header__title__link'),
			);
			for (let i = 0; i < titleList.length; ++i) {
				const titleElement = titleList[i];
				const href = await titleElement.getAttribute('href');
				this.detailPages.push(href);
			}
			console.log('this.detailPages', this.detailPages.length);
			this.detailPages = removeDuplicateStringArray(this.detailPages);
			console.log('remove duplicated', this.detailPages.length);
			// driver.quit();
			// this.prepareDriver(this.driverNumber);
			// this.parsing()
			await this.parsingData(driver);
			driver.quit();
		}

		// for (let i = 0; i < this.area.length; ++i) {
		// 	const _area = this.area[i];
		// 	for (let j = 0; j < this.genre.length; ++j) {
		// 		const _genre = this.genre[j];
		// 		for (let k = 0; k < this.subGenre.length; ++k) {
		// 			const _subGenre = this.subGenre[k];

		// 			const url = `${this.url}?area=${_area.code}&genre=${_genre.code}&subgenre=${_subGenre.code}`;

		// 			const driver = this.createDriver();
		// 			await driver.get(url);
		// 			// await this.spreadAllList(driver);
		// 			const titleList = await (await driver).findElements(
		// 				By.className('m-article-card__header__title__link'),
		// 			);
		// 			for (let i = 0; i < titleList.length; ++i) {
		// 				const titleElement = titleList[i];
		// 				const href = await titleElement.getAttribute('href');
		// 				this.detailPages.push(href);
		// 			}
		// 			console.log('this.detailPages', this.detailPages.length);
		// 			this.detailPages = removeDuplicateStringArray(this.detailPages);
		// 			console.log('remove duplicated', this.detailPages.length);
		// 			// driver.quit();
		// 			// this.prepareDriver(this.driverNumber);
		// 			// this.parsing()
		// 			await this.parsingData(driver);
		// 			driver.quit();
		// 			break;
		// 		}
		// 		break;
		// 	}
		// 	break;
		// }
	}

	parsing() {
		this.drivers.forEach((d: Driver) => {
			this.parsingData(d.getDriver());
		});
	}

	async parsingData(driver) {
		if (this.detailPages.length <= 0) {
			console.error('nothing to parsing');
			return;
		}

		const link = this.detailPages.shift() + 'shop';
		try {
			await driver.get(link);
			console.log('link', link);
			const wrapper = await driver.findElement(By.css('.item-body.basic'));
			console.log('els', wrapper);
			const els = await wrapper.findElements(By.css('dl'));
			const data = await this.getShopData(driver, els);
			console.log('result data', data);
		} catch (e) {
			console.error('error occured in parsingData');
		}
	}

	async getShopData(driver, els) {
		const shopData = this.utils.generateNewRecord();
		// els.forEach(async (el) => {
		for (let i = 0; i < els.length; ++i) {
			const el = els[i];
			const name = await el.findElement(By.css('dt'));
			const data = await el.findElement(By.css('dd'));
			const nameText = await name.getText();
			const dataText = await data.getText();
			if (Object.prototype.hasOwnProperty.call(shopData, nameText)) {
				shopData[nameText] = dataText;
			} else {
				// shopData[nameText] = 'NA';
			}
			console.log('shopData', shopData);
			// console.log(name, JSON.stringify(name.toString()));
			// console.log(data, JSON.stringify(data.toString()));
			// data[]
		}
		console.log('return shopData', shopData);
		return shopData;
		// });
	}

	/**
	 * 더보기 버튼을 통해 pagination이 적용된 페이지 이므로, 해당 페이지에서 제공하는 모든 리스트를 가져오기 위해서
	 * 더보기 버튼이 존재할 때까지 클릭을 시도함
	 */
	async spreadAllList(driver: any): Promise<boolean> {
		return new Promise(async (resolve, reject) => {
			try {
				let prevListCount;
				let startTime = Date.now();
				while (true) {
					const currentListCount = (
						await driver.findElements(By.className('o-result-article-list__item'))
					).length;
					const moreButton = await driver.findElement(By.className('m-read-more'));
					const endTime = Date.now();
					const passedTime = (endTime - startTime) / 1000;
					if (
						moreButton &&
						(prevListCount === undefined || (prevListCount && prevListCount < currentListCount)) &&
						passedTime > 2
					) {
						prevListCount = currentListCount;
						console.log('prevListCount = currentListCount', prevListCount, currentListCount);
						startTime = Date.now();
						console.log('click moreButton', passedTime);
						await moreButton.click();
					}
				}
			} finally {
				resolve(true);
			}
		});
	}
}
