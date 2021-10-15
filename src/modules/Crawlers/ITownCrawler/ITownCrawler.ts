import { Crawler } from 'src/modules/Crawlers/Crawler';
import { Driver } from 'src/modules/Driver';
import { CrawlingOption, CrawlerPage, removeDuplicateStringArray } from 'src/internals';
import {
	ITownUtils,
	ITOWN_OUTPUT_ITEMS,
	CELL_CODE,
	OutputRecords,
	CrawlingParam,
} from 'src/modules/ITownUtils';
import { zipCodeRegex, zipNumberCodeRegex } from 'src/constants';

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

				try {
					const noResult = await driver.findElement(By.className('o-resule-none-text'));
					if (noResult) {
						continue;
					}
				} catch (e) {
					// result exist
				}

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
				const shopData = await this.parsingShopData(driver, param);
				console.log('shopData', shopData);

				const savePath = this.utils.makeSaveDirectory(param);

				this.utils.saveToExcel(shopData, savePath);
			} catch (e) {
				console.error('error occured in run', e);
				throw e;
			}

			// cellData.push(shopData);
		}
		driver.quit();
	}

	async parsingShopData(driver: any, param: CrawlingParam): Promise<OutputRecords[]> {
		if (this.detailPages.length <= 0) {
			console.error('nothing to parsing');
			return;
		}

		const shopDatas = [];
		const startTime = Date.now();
		// 조회할 수 있는 페이지 만큼 반복
		while (this.detailPages.length > 0) {
			const endTime = Date.now();
			const passedTime = (endTime - startTime) / 1000;
			// 빠르게 하면 블럭당하기 때문에 반복 딜레이 설정
			if (passedTime < this.utils.getDelay()) {
				continue;
			}

			console.log('move to next link', passedTime);
			const originLink = this.detailPages.shift();
			// const originLink = 'https://itp.ne.jp/info/510000000000017534/';
			const link = originLink + 'shop';
			let wrapper;
			let shopData;
			let isShopExist = false;
			try {
				await driver.get(link);
				// NOTE: .item-bdoy.basic 엘리멘트를 찾으면, shop page가 있는것으로 가정함
				wrapper = await driver.findElement(By.css('.item-body.basic'));
				isShopExist = true;
			} catch (e) {
				// shop page is not exist
				console.log('shop page is not exist', originLink, e.message);
				if (e.message.includes('window was already closed')) {
					process.exit();
				}
			}

			try {
				if (isShopExist) {
					const els = await wrapper.findElements(By.css('dl'));
					shopData = await this.getShopData(driver, els);
				} else {
					shopData = await this.parsingNoneShopData(driver, originLink);
					// shopDatas.push(shopData);
					// startTime = Date.now(); // reset tick
					// continue;
				}
			} catch (e) {
				console.log('error occured when make shopData', e, shopData);
				throw e;
			}

			if (shopData) {
				shopData = this.utils.manufacturingData(shopData);
				shopData.url = isShopExist ? link : originLink;
				shopData[ITOWN_OUTPUT_ITEMS.TODOBUHYUN] = this.utils.getCodeName(
					CELL_CODE.TODO_NAME,
					+param.area,
				);
				shopData[ITOWN_OUTPUT_ITEMS.AREA] = this.utils.getCodeName(
					CELL_CODE.AREA_NAME,
					+param.area,
				);
				shopData[ITOWN_OUTPUT_ITEMS.GENRE] = this.utils.getCodeName(
					CELL_CODE.GENRE_NAME,
					+param.genre,
				);
				shopData[ITOWN_OUTPUT_ITEMS.SUBGENRE] = this.utils.getCodeName(
					CELL_CODE.SUBGENRE_NAME,
					+param.subGenre,
				);
				shopData[ITOWN_OUTPUT_ITEMS.EXPORT_DATA] = new Date(Date.now()).toISOString().split('T')[0];
				shopData = this.utils.processingEmptyValue(shopData);
				shopDatas.push(shopData);
			}

			// console.log('https://itp.ne.jp/info/050530901136440410/', shopData);
			// break;
		}
		return shopDatas;
	}

	async parsingNoneShopData(driver: any, link: string): Promise<Partial<OutputRecords>> {
		try {
			await driver.get(link);
			const data = this.utils.generateNewRecord();
			const companyName = await driver.findElement(By.css('h2.o-detail-header__title'));
			data[ITOWN_OUTPUT_ITEMS.COMPANY_NAME] = await companyName.getText();
			const els = await driver.findElements(By.css('.o-article-data'));
			for (let i = 0; i < els.length; ++i) {
				const el = els[i];
				const title = await el.findElement(By.css('.o-article-data__title'));
				const value = await el.findElement(By.css('.o-article-data__data'));
				const titleText = await title.getText();
				const valueText = await value.getText();
				console.log('titleText', titleText);
				if (titleText === ITOWN_OUTPUT_ITEMS.ADDRESS) {
					const zipCode = valueText.match(zipCodeRegex)[0];
					data[ITOWN_OUTPUT_ITEMS.ADDRESS] = valueText.replace(zipCodeRegex, '');
					data[ITOWN_OUTPUT_ITEMS.ZIP_CODE] = zipCode.match(zipNumberCodeRegex)[0];
				} else if (titleText === 'TEL') {
					// F専  팩스만 , F兼 팩스 전화번호 동일
					const phoneNumber = valueText.replace('(F専)', '');
					if (valueText.includes('専')) {
						data[ITOWN_OUTPUT_ITEMS.FAX_NUMBER] = phoneNumber;
						continue;
					}
					data[ITOWN_OUTPUT_ITEMS.PHONE_NUMBER] = phoneNumber;
				} else if (titleText === ITOWN_OUTPUT_ITEMS.HOME_PAGE) {
					data[ITOWN_OUTPUT_ITEMS.HOME_PAGE] = valueText;
				} else if (titleText === 'E-mail' || titleText === ITOWN_OUTPUT_ITEMS.E_MAIL) {
					data[ITOWN_OUTPUT_ITEMS.E_MAIL] = valueText;
				}
			}
			console.log('data', data);
			return data;
		} catch (e) {
			console.log('error on parsingNoneShopData::', e);
		}
	}

	async getShopData(driver, els): Promise<OutputRecords> {
		const shopData = this.utils.generateNewRecord();
		for (let i = 0; i < els.length; ++i) {
			const el = els[i];
			try {
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
			} catch (e) {
				console.log('e', el);
				continue;
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
