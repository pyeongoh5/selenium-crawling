import { Crawler } from 'src/modules/Crawlers/Crawler';
import { Driver } from 'src/modules/Driver';
import { CrawlingOption, CrawlerPage, removeDuplicateStringArray } from 'src/internals';
import { ITownUtils, CELL_CODE, OutputRecords, CrawlingParam } from 'src/modules/ITownUtils';

const sample = require('../../../../resources/sampleResult.json');
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
		console.log('sample', sample);
		this.utils.saveToExcel(sample);
		return;
		const params = this.utils.getDataParamsToCrawling(area, row);
		console.log('url', this.utils.getITownPageUrl(params[0]));

		const cellData: OutputRecords[][] = [];
		const driver = this.createDriver();
		for (let i = 0; i < params.length; ++i) {
			const param = params[i];
			const url = this.utils.getITownPageUrl(param);

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
			this.detailPages = removeDuplicateStringArray(this.detailPages);
			// driver.quit();
			// this.prepareDriver(this.driverNumber);
			// this.parsing()
			const shopData = await this.parsingData(driver, param);

			cellData.push(shopData);
			// console.log('shopData', shopData);
		}
		driver.quit();
		// console.log('cellData', cellData);

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

	async parsingData(driver: any, param: CrawlingParam): Promise<OutputRecords[]> {
		if (this.detailPages.length <= 0) {
			console.error('nothing to parsing');
			return;
		}

		const shopDatas = [];
		let startTime = Date.now();
		while (this.detailPages.length > 0) {
			const endTime = Date.now();
			const passedTime = (endTime - startTime) / 1000;
			if (passedTime < 2) {
				continue;
			}
			console.log('move to next link', passedTime);
			const link = this.detailPages.shift() + 'shop';
			try {
				await driver.get(link);
				console.log('link', link);
				const wrapper = await driver.findElement(By.css('.item-body.basic'));
				console.log('els', wrapper);
				const els = await wrapper.findElements(By.css('dl'));
				let shopData = await this.getShopData(driver, els);

				// CURRENT: shopPage에서 추출한 데이터에 추가적으로 해당 페이지의 url을 추가한다.
				// TODO: 이미 할당된 변수에 지속적으로 프로퍼티에 대한 값이 추가되고 있어서, 다른 좋은 방법을 구상해보자
				shopData.url = link;
				shopData['지역'] = this.utils.getCodeName(CELL_CODE.AREA_NAME, +param.area);
				shopData['대분류'] = this.utils.getCodeName(CELL_CODE.GENRE_NAME, +param.genre);
				shopData['소분류'] = this.utils.getCodeName(CELL_CODE.SUBGENRE_NAME, +param.subGenre);
				shopData['데이터 추출일시'] = new Date(Date.now()).toISOString().split('T')[0];
				shopData = this.utils.processingEmptyValue(shopData);
				shopDatas.push(shopData);
			} catch (e) {
				startTime = Date.now();
				console.error('error occured in parsingData');
			}
		}
		return shopDatas;
	}

	async getShopData(driver, els): Promise<OutputRecords> {
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
			// console.log(name, JSON.stringify(name.toString()));
			// console.log(data, JSON.stringify(data.toString()));
			// data[]
		}
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
