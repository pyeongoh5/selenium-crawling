import { CrawlerType } from 'src/enums';
import { isMacOS } from 'src/constants/constants';

const path = require('path');
const chromeVersion = require('../../package.json').chromeVersion;
const driverName = `chromedriver_${chromeVersion}${isMacOS ? '' : '_win.exe'}`;

interface CommandMeta {
	type: string;
	area: string;
	row: string;
	driverPath?: string;
	delay?: number;
	resourcePath?: string;
}

export class CommandParser {
	arguments: CommandMeta;

	constructor() {
		this.arguments = {
			type: CrawlerType.I_TOWN_PAGE,
			area: '2~',
			row: '2~',
			driverPath: path.resolve(driverName),
			delay: 2,
			resourcePath: path.resolve('resources/new_sample.xlsx'),
		};
	}

	parse(): CommandMeta {
		for (let i = 2; i < process.argv.length; ++i) {
			const arg = process.argv[i];

			if (arg) {
				console.log('arg', arg);
				const [key, value] = arg.split('=');
				if (Object.prototype.hasOwnProperty.call(this.arguments, key)) {
					this.arguments[key] = value;
				}
			}
		}

		return this.arguments;
	}
}
