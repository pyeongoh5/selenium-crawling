import * as XLSX from 'xlsx';
import { CrawlerPage } from 'src/internals';

const path = require('path');
const { readFile } = XLSX;
const excelPath = path.resolve('resources/sample.xlsx');
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
}

type OutputRecords = { [key in ITOWN_OUTPUT_ITEMS]: string };

interface CellLocation {
	row: string;
	col: string;
}

interface CrawlingParam {
	area: string;
	genre: string;
	subGenre: string;
}

type CrawlingParams = CrawlingParam[];

enum CELL_CODE {
	AREA_CODE = 'B',
	GENRE_CODE = 'G',
	SUBGENRE_CODE = 'H',
}

export class ITownUtils {
	cellRange: CellLocation[];
	sheet: XLSX.WorkSheet;
	constructor() {
		this.cellRange = [];
	}

	/**
	 * Excel File에서, style sheet와 해당 sheet의 정보 범위를 추출한다.
	 */
	parserInputExcel() {
		const wb: XLSX.WorkBook = readFile(excelPath);
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
		const areaStart = +areaRanges[0] || 2;
		const areaEnd = +areaRanges[1] || (areaRanges.length > 1 ? 48 : areaStart);
		const cellStart = +cellRanges[0] || 1;
		const cellEnd = +cellRanges[1] || (cellRanges.length > 1 ? this.cellRange[1].row : cellStart);

		console.log('areaRanges', areaEnd, cellEnd, this.cellRange);
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
}
