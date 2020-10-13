import { CrawlerType } from 'src/enums';
const path = require('path');

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
			driverPath: path.resolve('chromedriver_85'),
			delay: 2,
			resourcePath: path.resolve('resources/sample.xlsx'),
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
