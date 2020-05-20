// require("babel-core/register");
// require("babel-polyfill");
const fs = require('fs');
const path = require('path');
const os = require('os');
const By = require('selenium-webdriver').By;
const chrome = require('selenium-webdriver/chrome');

const isMacOS = process.platform === 'darwin';

const chromeOptions = new chrome.Options();
chromeOptions.addArguments('headless');
let urls;
const drivers = [];
let doenDriverCount = 0;
let inspectionCount = 0;
const emails = [];
const overviewLinks = [];
const filename = `${new Date().toISOString().split('T')[0]}-${Date.now()}.txt`;
let processCount;
if (process.argv) {
  console.log('process.argv', process.argv);
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

// const chromeDriverPath = path.resolve("chromedriver_83");
const driverName = `chromedriver_83${isMacOS ? '' : '_win.exe'}`;
const chromeDriverPath = path.resolve(driverName);
console.log('chromeDriverPath', chromeDriverPath);
const serviceBuilder = new ServiceBuilder(chromeDriverPath);

console.log('serviceBuilder', serviceBuilder);
const driver = new Builder()
  .forBrowser('chrome')
  .setChromeService(serviceBuilder)
  // .setChromeOptions(chromeOptions)
  .build();
// const url = 'https://itp.ne.jp/genre/?area=13&genre=3&subgenre=70&sort=01&sbmap=false';
// urls = ['https://itp.ne.jp/genre/?area=13&genre=3&subgenre=70&sort=01&sbmap=false'];

const start = Date.now();

const startCrawling = async (url) => {
  console.log('startCrawling', overviewLinks.length);
  await driver.get(url);
  await spreadAllList();
  const titleList = await (await driver).findElements(By.className('m-article-card__header__title__link'));
  console.log('done', titleList.length);
  
  for (let i = 0; i < titleList.length; ++i) {
    const titleElement = titleList[i];
    const href = await titleElement.getAttribute('href');
    overviewLinks.push(href);
  }

  if (urls.length > 0) {
    const url = urls.shift();
    await startCrawling(url);
  } else {
    driver.quit();
    createMultiDrivers(cpuCount);
    startParsing();
  }
}

const createMultiDrivers = (cpuCount) => {
  for (let i = 0; i < cpuCount; ++i) {
    drivers.push(
      new Builder()
      .forBrowser('chrome')
      .setChromeService(serviceBuilder)
      .setChromeOptions(chromeOptions)
      .build()
    );
  }
}

const startParsing = () => {
  drivers.forEach((_driver) => {
    parsingEmail(_driver);
  });
};

const parsingEmail = async(_driver) => {
  console.log('inspectionCount', inspectionCount);
  if (overviewLinks.length > 0) {
    let link = overviewLinks.shift();
    let findMail = false;
    try {
      console.log('link: ', link);
      await _driver.get(link);
      // #__layout > div > article > div > div > div > main > div > dl:nth-child(7) > dd > a:nth-child(1)
      const el = await _driver.findElement(By.css('a[href*="mailto"]'));
      // const text = await el.getText();
      console.log('el', el);
      const text = await el.getAttribute('href');
      emails.push(text.split('mailto:')[1]);
      console.log('email: ', text);
      findMail = true;
    } catch(e) {
      console.log('email is not exist in', link);
    }
    if (!findMail) {
      try {
        link += 'shop'
        console.log('link: ', link);
        await _driver.get(link);
        // .item-body.basic dl:nth-child(10) dd a 
        const el = await _driver.findElement(By.css('a[href*="mailto"]'));
        console.log('el', el);
        const text = await el.getAttribute('href');
        emails.push(text.split('mailto:')[1]);
        console.log('email: ', text);
      } catch(e) {
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
}

const saveToFile = () => {
  fs.writeFile(path.resolve(filename), emails.join('\r\n'), (err) => {
    if (err) {
      console.log('writing error', err);
      return;
    }
    const end = Date.now();
    console.log(`${emails.length} mails saved!!`);
    console.log('write done!!');
    console.log('running time is', end - start, 'ms');
    console.log('your cpu count is', cpuCount)

  });
}

// const getUrl = async (url) => {
//   await driver.get(url);
//   await spreadAllList();
//   const titleList = await (await driver).findElements(By.className('m-article-card__header__title__link'));
//   console.log('done', titleList.length);
  
//   for (let i = 0; i < titleList.length; ++i) {
//     const titleElement = titleList[i];
//     const href = await titleElement.getAttribute('href');
//     overviewLinks.push(href);
//   }
//   // console.log('overviewLinks', overviewLinks.length, os.cpus());
  
//   for(let i = 0; i < overviewLinks.length; ++i) {
//     let link = overviewLinks[i];
//     let findMail = false;
//     try {
//       console.log('link: ', link);
//       await driver.get(link);
//       // #__layout > div > article > div > div > div > main > div > dl:nth-child(7) > dd > a:nth-child(1)
//       const el = await driver.findElement(By.css('a[href*="mailto"]'));
//       // const text = await el.getText();
//       console.log('el', el);
//       const text = await el.getAttribute('href');
//       emails.push(text);
//       console.log('email: ', text);
//       findMail = true;
//     } catch(e) {
//       console.log('email is not exist in', link);
//     }
//     if (!findMail) {
//       try {
//         link += 'shop'
//         console.log('link: ', link);
//         await driver.get(link);
//         // .item-body.basic dl:nth-child(10) dd a 
//         const el = await driver.findElement(By.css('a[href*="mailto"]'));
//         console.log('el', el);
//         const text = await el.getAttribute('href');
//         emails.push(text);
//         console.log('email: ', text);
//       } catch(e) {
//         console.log('email is not exist in', link);
//       }
//     }
//   }
//   console.log('emails', emails.length);
//   // fs.writeFile(path.join(os.homedir(), 'mail-list.txt'), emails.join('\n'), (err) => {
//   if (urls.length > 0) {
//     const url = urls.shift();
//     await getUrl(url);
//   } else {
//     fs.writeFile(path.resolve(filename), emails.join('\r\n'), (err) => {
//       if (err) {
//         console.log('writing error', err);
//         return;
//       }
//       const end = Date.now();
//       console.log('write done!', end - start, 'ms');
//       driver.quit();
//     });
//   }
// };

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
      // if (isFirstTry) {
      //   return await spreadAllList(false);
      // } else {
        resolve(true);
      // }
    }
  });
}
const url = urls.shift();
startCrawling(url);


// const a = overviewLinks.slice(0, 10);
  // const b = overviewLinks.slice(10, 20);

  // const secondDriver = new webdriver.Builder()
  // .withCapabilities(chromeCapabilities)
  // .build();