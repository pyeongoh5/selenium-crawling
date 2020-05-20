// require("babel-core/register");
// require("babel-polyfill");
const fs = require('fs');
const path = require('path');
const os = require('os');
const By = require('selenium-webdriver').By;

const isMacOS = process.platform === 'darwin';

let urls;
const emails = [];
const filename = `${new Date().toISOString().split('T')[0]}.txt`;

if (process.argv) {
  console.log('process.argv', process.argv);
  urls = process.argv[2].trim().split('url=')[1].split(',');
}

if (!urls) {
  console.error('url paramter must be input!!');
  console.log('paramter format:: url={url address}');
}

const { ServiceBuilder } = require('selenium-webdriver/chrome');
const { Builder } = require('selenium-webdriver');

// const chromeDriverPath = path.resolve("chromedriver_83");
const driverName = `chromedriver_83${isMacOS ? '' : '_win.exe'}`;
const chromeDriverPath = path.resolve(driverName);
console.log('chromeDriverPath', chromeDriverPath);
const serviceBuilder = new ServiceBuilder(chromeDriverPath);

console.log('serviceBuilder', serviceBuilder);
const driver = new Builder()
  .forBrowser('chrome')
  .setChromeService(serviceBuilder)
  .build();
// const url = 'https://itp.ne.jp/genre/?area=13&genre=3&subgenre=70&sort=01&sbmap=false';
const getUrl = async (url) => {
  await driver.get(url);
  // await spreadAllList();
  const titleList = await (await driver).findElements(By.className('m-article-card__header__title__link'));
  console.log('done', titleList.length);
  const overviewLinks = [];
  
  for (let i = 0; i < titleList.length; ++i) {
    const titleElement = titleList[i];
    const href = await titleElement.getAttribute('href');
    console.log('titleElement', href);
    overviewLinks.push(`${href}shop`);
  }
  console.log('overviewLinks', overviewLinks.length, os.cpus());

  const start = Date.now();
  for(let i = 0; i < overviewLinks.length; ++i) {
    const link = overviewLinks[i];
    try {
      console.log('link', link);
      await driver.get(link);
      const el = await driver.findElement(By.css('.item-body.basic dl:nth-child(10) dd a'));
      console.log('el', el);
      const text = await el.getText();
      emails.push(text);
      console.log('text', text);
    } catch(e) {
      console.log('email is not exist in', link);
      // emails.push(link);
    }
  }
  console.log('emails', emails.length);
  // fs.writeFile(path.join(os.homedir(), 'mail-list.txt'), emails.join('\n'), (err) => {
  if (urls.length > 0) {
    const url = urls.shift();
    await getUrl(url);
  } else {
    fs.writeFile(path.resolve(filename), emails.join('\r\n'), (err) => {
      if (err) {
        console.log('writing error', err);
        return;
      }
      const end = Date.now();
      console.log('write done!', end - start, 'ms');
      driver.quit();
    });
  }
};

const spreadAllList = async () => {
  return new Promise(async (resolve, reject) => {
    try {
      while(true) {
        const moreButton = await driver.findElement(By.className('m-read-more'));
        // console.log('moreButton', moreButton);
        if (moreButton) {
          await moreButton.click();
          // spreadAllList();
        }
      }
    } catch (e) {
      console.log('not found', e);
      resolve(true);
    }
  });
}
const url = urls.shift();
getUrl(url);


// const a = overviewLinks.slice(0, 10);
  // const b = overviewLinks.slice(10, 20);

  // const secondDriver = new webdriver.Builder()
  // .withCapabilities(chromeCapabilities)
  // .build();