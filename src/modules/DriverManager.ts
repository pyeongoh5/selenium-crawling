import { Driver, isMacOS } from 'src/internals';

const path = require('path');

export class DriverManager {
	drivers: Driver[];
	chromeDriverPath: string;
	driverIterator;

	constructor() {
		this.drivers;
		const driverName = `chromedriver_83${isMacOS ? '' : '_win.exe'}`;
		this.chromeDriverPath = path.resolve(driverName);
	}

	public createDrivers(driverNumber): number {
		for (let i = 0; i < driverNumber; ++i) {
			this.drivers.push(new Driver(this.chromeDriverPath));
		}
		this.resetDriverIteration();

		// 생성된 driver 갯수를 반환
		return this.drivers.length;
	}

	private resetDriverIteration(): void {
		this.driverIterator = this.drivers[Symbol.iterator]();
	}

	public getNextDriver(): Driver {
		let next = this.driverIterator.next();
		if (!next.value) {
			this.resetDriverIteration();
			next = this.driverIterator.next();
		}
		return next;
	}
}
