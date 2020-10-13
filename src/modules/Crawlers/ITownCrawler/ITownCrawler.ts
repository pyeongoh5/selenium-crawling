import { Crawler } from 'src/modules/Crawlers/Crawler';
import { Driver } from 'src/modules/Driver';
import { CrawlingOption, CrawlerPage, removeDuplicateStringArray } from 'src/internals';
import { ITownUtils, CELL_CODE, OutputRecords, CrawlingParam } from 'src/modules/ITownUtils';
import {
	urlRegex,
	zipCodeRegex,
	zipNumberCodeRegex,
	phoneNumberRegex,
	emailRegex,
} from 'src/constants';

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
	}

	async run(area?: string, row?: string): Promise<void>;
	async run(area: string, row: string): Promise<void> {
		const params = this.utils.getDataParamsToCrawling(area, row);
		console.log('url', this.utils.getITownPageUrl(params[0]));

		console.log('createDriver', this.utils.getDriverPath());
		const driver = this.createDriver(this.utils.getDriverPath());
		for (let i = 0; i < params.length; ++i) {
			const param = params[i];
			const url = this.utils.getITownPageUrl(param);
			try {
				await driver.get(url);
				// const noResult = await driver.findElement(By.className('o-resule-none-text'));
				// if (noResult) {
				// 	continue;
				// }
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
				const shopData = await this.parsingData(driver, param);
				console.log('shopData', shopData);

				const savePath = this.utils.makeSaveDirectory(param);

				this.utils.saveToExcel(shopData, savePath);
			} catch (e) {
				console.error('error occured in run', e);
			}

			// cellData.push(shopData);
		}
		driver.quit();
	}

	async parsingData(driver: any, param: CrawlingParam): Promise<OutputRecords[]> {
		if (this.detailPages.length <= 0) {
			console.error('nothing to parsing');
			return;
		}

		const shopDatas = [];
		let startTime = Date.now();
		// 조회할 수 있는 페이지 만큼 반복
		while (this.detailPages.length > 0) {
			const endTime = Date.now();
			const passedTime = (endTime - startTime) / 1000;
			// 빠르게 하면 블럭당하기 때문에 반복 딜레이 설정
			if (passedTime < this.utils.getDelay()) {
				continue;
			}

			console.log('move to next link', passedTime);
			const link = this.detailPages.shift() + 'shop';
			try {
				await driver.get(link);
				console.log('link', link);
				const wrapper = await driver.findElement(By.css('.item-body.basic'));
				const els = await wrapper.findElements(By.css('dl'));
				let shopData = await this.getShopData(driver, els);
				shopData = this.utils.manufacturingData(shopData);
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
				console.error('error occured in parsingData', e);
			}
		}
		return shopDatas;
	}

	async getShopData(driver, els): Promise<OutputRecords> {
		const shopData = this.utils.generateNewRecord();
		for (let i = 0; i < els.length; ++i) {
			const el = els[i];
			const name = await el.findElement(By.css('dt'));
			const nameText = await name.getText();
			let data = await el.findElement(By.css('dd'));
			let dataText = '';
			// 전화 번호
			if (nameText === '電話番号') {
				data = await data.findElements(By.css('.tell'));
				console.log('data', data);
				const dataTexts = [];
				for (let i = 0; i < data.length; ++i) {
					dataTexts.push(await data[i].getText());
				}

				dataText = dataTexts.join(', ');
			} else {
				dataText = await data.getText();
			}

			if (Object.prototype.hasOwnProperty.call(shopData, nameText)) {
				shopData[nameText] = dataText;
			}
		}
		console.log('getShopData', shopData);
		return shopData;
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
						passedTime > this.utils.getDelay()
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
