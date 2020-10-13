import * as XLSX from 'xlsx';
import { CrawlerPage, pad } from 'src/internals';
import fs from 'fs';
import { emailRegex, minimumRow, urlRegex, zipCodeRegex, zipNumberCodeRegex } from 'src/constants';

const os = require('os');
const path = require('path');
const { readFile, utils, writeFile } = XLSX;
// const excelPath = '../resources/test.xlsx';

enum ITOWN_OUTPUT_ITEMS {
	AREA = '지역',
	GENRE = '대분류',
	SUBGENRE = '소분류',
	COMPANY_NAME = '掲載名',
	PHONE_NUMBER = '電話番号',
	FAX_NUMBER = 'FAX番号',
	ADDRESS = '住所',
	ZIP_CODE = '우편번호',
	HOME_PAGE = 'ホームページ',
	E_MAIL = 'E-mailアドレス',
	EXPORT_DATA = '데이터 추출일시',
	LINK = 'url',
}

export enum CELL_CODE {
	AREA_CODE = 'B',
	AREA_NAME = 'C',
	GENRE_CODE = 'G',
	GENRE_NAME = 'E',
	SUBGENRE_CODE = 'H',
	SUBGENRE_NAME = 'F',
}

export type CELL_CODE_NAME = CELL_CODE.AREA_NAME | CELL_CODE.GENRE_NAME | CELL_CODE.SUBGENRE_NAME;

export type OutputRecords = { [key in ITOWN_OUTPUT_ITEMS]: string };

interface CellLocation {
	row: string;
	col: string;
}

export interface CrawlingParam {
	area: string;
	genre: string;
	subGenre: string;
}

type CrawlingParams = CrawlingParam[];

interface ITownCode {
	[key: string]: string;
}

interface ITownCodeMap {
	area: ITownCode;
	genre: ITownCode;
	subGenre: ITownCode;
}

export class ITownUtils {
	// NOTE: Maybe Common Util Variables
	driverPath: string;
	delay: number;
	resourcePath: string;

	rootSavePath: string;
	cellRange: CellLocation[];
	sheet: XLSX.WorkSheet;
	iTownCodeMap: ITownCodeMap;

	constructor() {
		this.cellRange = [];
		this.iTownCodeMap = {
			area: {},
			genre: {},
			subGenre: {},
		};
		this.rootSavePath = `${os.homedir()}/Desktop/CrawlingResult`;
	}

	/**
	 * maybe common uitl function
	 * @param driverPath
	 */
	setDriverPath(driverPath: string): void {
		this.driverPath = driverPath;
	}

	/**
	 * maybe common uitl function
	 */
	getDriverPath(): string {
		return this.driverPath;
	}

	/**
	 * maybe common uitl function
	 * @param delay
	 */
	setDelay(delay: number): void {
		this.delay = delay;
	}

	/**
	 * maybe common uitl function
	 */
	getDelay(): number {
		return this.delay;
	}

	setResourcePath(resourcePath: string): void {
		this.resourcePath = resourcePath;
	}

	/**
	 * Excel File에서, style sheet와 해당 sheet의 정보 범위를 추출한다.
	 */
	parserInputExcel(): void {
		console.log('parserInputExcel', this.resourcePath);
		const wb: XLSX.WorkBook = readFile(this.resourcePath);
		const sheetName = wb.SheetNames[0];
		this.sheet = wb.Sheets[sheetName];

		const ref = this.sheet['!ref']; // cell의 데이터 범위 ex) A1:H421
		const refs = ref.split(':');
		const rowRegex = /[0-9]+/g;
		const colRegex = /[a-zA-Z]/g;
		refs.forEach((r: string, index: number) => {
			// 엑셀의 표시되는 행을 입력할 것이고, 실제로 첫 행은 의미 없는 타이틀에 대한 행이기 때문에 시작 레인지의 첫 행에 +1을 보정한다.
			const rowNum = +r.match(rowRegex)[0] + (index ? 0 : 1);
			const colNum = r.match(colRegex)[0];

			const rowPrefix = rowNum[0] === '0';
			const colPrefix = colNum[0] === '0';

			// 숫자가 09인 경우 url파라미터 상 9로 넣으면 동작하지 않고 09로 넣어야 한다.
			const row = rowPrefix ? '0' + rowNum : `${rowNum}`;
			const col = colPrefix ? '0' + colNum : `${colNum}`;

			this.cellRange.push({
				row,
				col,
			});
		});

		this.generateCodeMap();
	}

	/**
	 * Crawling으로 파싱할 Input Excel 데이터에서의 행단위 범위
	 * ex)
	 * n (n번째 하나)
	 * ~n (n번째 행까지를 의미)
	 * n~ (n번째 행부터 Range의 끝가지)
	 * n~m (n부터 m까지)
	 * @param _areaRange
	 * @param _cellRange
	 */
	getDataParamsToCrawling(_areaRange: string, _cellRange: string): CrawlingParams {
		const areaRanges = _areaRange.split('~');
		const cellRanges = _cellRange.split('~');

		const params = [];
		const areaStart = +areaRanges[0] || minimumRow;
		const areaEnd = +areaRanges[1] || (areaRanges.length > 1 ? 48 : areaStart);
		const cellStart = +cellRanges[0] || minimumRow;
		const cellEnd = +cellRanges[1] || (cellRanges.length > 1 ? this.cellRange[1].row : cellStart);

		console.log('areaRanges', areaStart, areaEnd, cellStart, cellEnd, this.cellRange);
		for (let i = areaStart; i <= areaEnd; ++i) {
			const areaCode = this.sheet[CELL_CODE.AREA_CODE + i].v;

			for (let j = cellStart; j <= cellEnd; ++j) {
				const genreCode = this.sheet[CELL_CODE.GENRE_CODE + j].v;
				const subGenreCode = this.sheet[CELL_CODE.SUBGENRE_CODE + j].v;

				params.push({
					area: areaCode,
					genre: genreCode,
					subGenre: subGenreCode,
				});
			}
		}
		console.log('params', params, params.length);

		return params;
	}

	getITownPageUrl(param: CrawlingParam): string {
		const { area, genre, subGenre } = param;

		return `${CrawlerPage.I_TOWN_PAGE}?area=${area}&genre=${genre}&subgenre=${subGenre}`;
	}

	generateNewRecord(): OutputRecords {
		const record = {};
		Object.keys(ITOWN_OUTPUT_ITEMS).map(key => {
			record[ITOWN_OUTPUT_ITEMS[key]] = undefined;
		});
		return record as OutputRecords;
	}

	/**
	 * 코드 번호와 이름을 매칭시킬수 있는 맵 변수 생성
	 * ex)
	 * area[1]: 훗카이도
	 * genre[1]: 병원
	 * subGenre[1]: 치과
	 */
	private generateCodeMap(): void {
		const maxRows: number = +this.cellRange[1].row;
		console.log('maxRows', maxRows);
		for (let i = 2; i <= maxRows; i++) {
			if (this.sheet[`${CELL_CODE.AREA_CODE}${i}`]) {
				const areaCode = this.sheet[`${CELL_CODE.AREA_CODE}${i}`].v;
				const areaName = this.sheet[`${CELL_CODE.AREA_NAME}${i}`].v;
				this.iTownCodeMap.area[+areaCode] = areaName;
			}
			const genreCode = this.sheet[`${CELL_CODE.GENRE_CODE}${i}`].v;
			const genreName = this.sheet[`${CELL_CODE.GENRE_NAME}${i}`].v;
			const subGenreCode = this.sheet[`${CELL_CODE.SUBGENRE_CODE}${i}`].v;
			const subGenreName = this.sheet[`${CELL_CODE.SUBGENRE_NAME}${i}`].v;
			this.iTownCodeMap.genre[genreCode] = genreName;
			this.iTownCodeMap.subGenre[subGenreCode] = subGenreName;
		}
	}

	getCodeName(codeName: CELL_CODE_NAME, row: number): string {
		switch (codeName) {
			case CELL_CODE.AREA_NAME:
				return this.iTownCodeMap.area[row];
			case CELL_CODE.GENRE_NAME:
				return this.iTownCodeMap.genre[row];
			case CELL_CODE.SUBGENRE_NAME:
				return this.iTownCodeMap.subGenre[row];
		}
	}

	manufacturingData(shopData: OutputRecords): OutputRecords {
		// 주소
		if (shopData['住所'] && shopData['住所'].match(zipCodeRegex)) {
			const zipCodeMatches = shopData['住所'].match(zipCodeRegex);
			shopData['住所'] = shopData['住所'].replace(zipCodeRegex, '');
			shopData['住所'] = shopData['住所'].replace('地図', ''); // '지도' 라는 문구 삭제
			shopData['우편번호'] = zipCodeMatches[0].match(zipNumberCodeRegex)[0];
		}

		// url
		if (shopData['ホームページ'] && shopData['ホームページ'].match(urlRegex)) {
			const urlMatches = shopData['ホームページ'].match(urlRegex);
			shopData['ホームページ'] = urlMatches[0];
		} else {
			shopData['ホームページ'] = undefined;
		}

		// email
		if (shopData['E-mailアドレス'] && shopData['E-mailアドレス'].match(emailRegex)) {
			shopData['E-mailアドレス'] = shopData['E-mailアドレス'].match(emailRegex)[0];
		}
		// if (shopData['電話番号'] && shopData['電話番号'].match(phoneNumberRegex)) {
		// 	shopData['電話番号'] = shopData['電話番号'].match(phoneNumberRegex)[0];
		// }
		return shopData;
	}

	processingEmptyValue(data: OutputRecords): OutputRecords {
		Object.keys(data).forEach((key: string) => {
			// ITown 에서는 없는 값을 '－' 문자로 표시함
			if (data[key] === undefined || data[key] === '－') {
				data[key] = 'n.a.';
			}
			return data[key];
		});

		return data;
	}

	makeSaveDirectory(param: CrawlingParam): string {
		if (!fs.existsSync(this.rootSavePath)) {
			fs.mkdirSync(this.rootSavePath);
		}
		const areaPath = `${this.rootSavePath}/${this.getCodeName(CELL_CODE.AREA_NAME, +param.area)}`;
		if (!fs.existsSync(areaPath)) {
			fs.mkdirSync(areaPath);
		}
		const genrePath = `${areaPath}/${this.getCodeName(CELL_CODE.GENRE_NAME, +param.genre)}`;
		if (!fs.existsSync(genrePath)) {
			fs.mkdirSync(genrePath);
		}
		const subGenrePath = `${genrePath}/${this.getCodeName(
			CELL_CODE.SUBGENRE_NAME,
			+param.subGenre,
		)}`;
		// if (!fs.existsSync(subGenrePath)) {
		// 	fs.mkdirSync(subGenrePath);
		// }
		return subGenrePath;
	}

	saveToExcel(data: OutputRecords[], savePath: string) {
		const wb = utils.book_new();
		const excelJsonData = [];
		excelJsonData.push(Object.keys(ITOWN_OUTPUT_ITEMS).map(key => ITOWN_OUTPUT_ITEMS[key]));

		data.forEach(record => {
			console.log('record', record);
			const d = Object.keys(record).map(key => {
				return record[key];
			});
			excelJsonData.push(d);
		});

		console.log('excelJsonData', excelJsonData);
		const sheet = utils.aoa_to_sheet(excelJsonData);
		console.log('sheet', sheet);
		utils.book_append_sheet(wb, sheet, 'output');
		console.log('path', path.resolve('Desktop'));
		writeFile(wb, `${savePath}.csv`);
	}
}
