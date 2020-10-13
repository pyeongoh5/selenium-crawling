import { Driver } from 'src/modules/Driver';
import { isMacOS } from 'src/constants/constants';
import { ITownUtils } from '../ITownUtils';

console.log('Driver', Driver);

const path = require('path');
const chromeVersion = require('../../../package.json').chromeVersion;
const driverName = `chromedriver_${chromeVersion}${isMacOS ? '' : '_win.exe'}`;
const chromeDriverPath = path.resolve(driverName);

export abstract class Crawler {
	drivers: Driver[];
	driverNumber: number;
	utils: ITownUtils;

	constructor() {
		this.drivers = [];
	}

	/**
	 * crawler가 사용할 driver 갯수를 설정한다.
	 * @param amount
	 */
	public prepareDriver(amount: number): void {
		for (let i = 0; i < amount; i++) {
			this.drivers.push(this.createDriver());
		}
	}

	public createDriver(driverPath: string = chromeDriverPath): any {
		return new Driver(driverPath).getDriver();
	}

	public setDriverCount(count: number): void {
		this.driverNumber = count;
	}

	setDriverPath(driverPath: string): void {
		this.utils.setDriverPath(driverPath);
	}

	setDelay(delay: number): void {
		this.utils.setDelay(delay);
	}

	setResourcePath(resourcePath: string): void {
		this.utils.setResourcePath(resourcePath);
	}

	parserInputExcel(): void {
		this.utils.parserInputExcel();
	}

	abstract run(): Promise<void>;
	abstract run(area?: string, row?: string): Promise<void>;
	abstract run(area: string, row: string): Promise<void>;
}
