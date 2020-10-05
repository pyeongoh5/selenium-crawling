import { CrawlerType } from 'src/enums';
import { CrawlerTypeList } from 'src/constants';

export const isValidCrawlerType = (type: string): type is CrawlerType => {
	console.log('isValidCrawlerType', type, CrawlerType);
	return CrawlerTypeList.indexOf(type as CrawlerType) !== -1;
};

export const removeDuplicateStringArray = (arr: string[]): string[] => {
	const hash = {};
	arr.forEach(v => {
		if (!hash[v]) {
			hash[v] = true;
		}
	});
	return Object.keys(hash);
};

export function pad(d): string {
	return d < 10 ? '0' + d.toString() : d.toString();
}
