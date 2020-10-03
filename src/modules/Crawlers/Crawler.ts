import { Driver } from 'src/modules/Driver';
import { isMacOS } from 'src/constants/constants';

console.log('Driver', Driver);

const path = require('path');
const chromeVersion = require('../../../package.json').chromeVersion;
const driverName = `chromedriver_${chromeVersion}${isMacOS ? '' : '_win.exe'}`;
const chromeDriverPath = path.resolve(driverName);

export abstract class Crawler {
	drivers: Driver[];
	driverNumber: number;

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

	public createDriver(): any {
		return new Driver(chromeDriverPath).getDriver();
	}

	public setDriverCount(count: number): void {
		this.driverNumber = count;
	}

	abstract run(): Promise<void>;
	abstract run(area?: string, row?: string): Promise<void>;
	abstract run(area: string, row: string): Promise<void>;
}
