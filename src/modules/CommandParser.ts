import { CrawlerType } from 'src/enums';
const os = require('os');

console.log('CommandParser');
interface CommandMeta {
	type: string;
	area: string;
	row: string;
}

export class CommandParser {
	parse(): CommandMeta {
		const type = process.argv[2] ? process.argv[2].trim().split('=')[1] : CrawlerType.I_TOWN_PAGE;
		const area = process.argv[3] ? process.argv[3].trim().split('=')[1] : '2~';
		const row = process.argv[4] ? process.argv[4].trim().split('=')[1] : '2~';

		return {
			type,
			area,
			row,
		};
	}
}
