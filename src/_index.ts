import { isMacOS } from './constants/constants';

const fs = require('fs');
const path = require('path');
const os = require('os');
const By = require('selenium-webdriver').By;
const chrome = require('selenium-webdriver/chrome');

const chromeOptions = new chrome.Options();
chromeOptions.addArguments('headless');
let urls;
const drivers = [];
let doenDriverCount = 0;
let inspectionCount = 0;
const emails = [];
// const overviewLinks = [];
let overviewLinks = [];
const filename = `${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`;
let processCount;
if (process.argv) {
	urls = process.argv[2] && process.argv[2].trim().split('url=')[1].split(',');
	processCount = process.argv[3] && process.argv[3].trim().split('=')[1];
}
const cpuCount = processCount ? processCount : os.cpus().length * 2;
console.log('cpuCount', cpuCount);

if (!urls) {
	console.error('url paramter must be input!!');
	console.log('paramter format:: url={url address}');
}

const { ServiceBuilder } = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');

// 현재는 chrome 83버전을 기준으로만 지원함
const driverName = `chromedriver_83${isMacOS ? '' : '_win.exe'}`;
const chromeDriverPath = path.resolve(driverName);
const serviceBuilder = new ServiceBuilder(chromeDriverPath);

const driver = new Builder().forBrowser('chrome').setChromeService(serviceBuilder).build();

const start = Date.now();

const startCrawling = async url => {
	await driver.get(url);
	await spreadAllList();
	const titleList = await (await driver).findElements(
		By.className('m-article-card__header__title__link'),
	);
	for (let i = 0; i < titleList.length; ++i) {
		const titleElement = titleList[i];
		const href = await titleElement.getAttribute('href');
		overviewLinks.push(href);
	}
	console.log('諸岡 클리닉', overviewLinks.indexOf('  '));
	console.log('overviewLinks');

	if (urls.length > 0) {
		const url = urls.shift();
		await startCrawling(url);
	} else {
		driver.quit();
		createMultiDrivers(cpuCount);
		startParsing();
	}
};

const createMultiDrivers = cpuCount => {
	for (let i = 0; i < cpuCount; ++i) {
		drivers.push(
			new Builder()
				.forBrowser('chrome')
				.setChromeService(serviceBuilder)
				.setChromeOptions(chromeOptions)
				.build(),
		);
	}
};

const startParsing = () => {
	drivers.forEach(_driver => {
		parsingEmail(_driver);
	});
};

const parsingEmail = async _driver => {
	console.log('inspectionCount', inspectionCount);
	if (overviewLinks.length > 500) {
		overviewLinks = overviewLinks.slice(0, 500);
	}
	if (overviewLinks.length > 0) {
		let link = overviewLinks.shift();
		let findMail = false;
		try {
			await _driver.get(link);
			const el = await _driver.findElement(By.css('a[href*="mailto"]'));
			const text = await el.getAttribute('href');
			const email = text.split('mailto:')[1];
			console.log('find email:', email);
			emails.push(email);
			findMail = true;
		} catch (e) {
			console.log('email is not exist in', link);
		}
		if (!findMail) {
			try {
				link += 'shop';
				await _driver.get(link);
				const el = await _driver.findElement(By.css('a[href*="mailto"]'));
				const text = await el.getAttribute('href');
				const email = text.split('mailto:')[1];
				console.log('find email:', email);
				emails.push(email);
			} catch (e) {
				console.log('email is not exist in', link);
			}
		}
		++inspectionCount;
		parsingEmail(_driver);
	} else {
		doenDriverCount++;
		if (doenDriverCount === drivers.length) {
			saveToFile();
		}
		_driver.quit();
	}
};

const saveToFile = () => {
	fs.writeFile(path.resolve(filename), emails.join('\r\n'), err => {
		if (err) {
			console.log('writing error', err);
			return;
		}
		const end = Date.now();
		console.log(`${emails.length} mails saved!!`);
		console.log('write done!!');
		console.log('running time is', end - start, 'ms');
		console.log('your cpu count is', cpuCount);
	});
};

/**
 * 더보기 버튼을 통해 pagination이 적용된 페이지 이므로, 해당 페이지에서 제공하는 모든 리스트를 가져오기 위해서
 * 더보기 버튼이 존재할 때까지 클릭을 시도함
 */
const spreadAllList = async () => {
	return new Promise(async (resolve, reject) => {
		try {
			while (true) {
				const moreButton = await driver.findElement(By.className('m-read-more'));
				if (moreButton) {
					await moreButton.click();
				}
			}
		} catch (e) {
			resolve(true);
		}
	});
};
const url = urls.shift();
startCrawling(url);
