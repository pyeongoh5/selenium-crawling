// require("babel-core/register");
// require("babel-polyfill");
const fs = require('fs');
const path = require('path');
const os = require('os');
const webdriver = require('selenium-webdriver');
const By = require('selenium-webdriver').By;
const cheerio = require('cheerio');
const request = require('request');
const chromeCapabilities = webdriver.Capabilities.chrome();
const chromeOptions = {
  'args': ['--no-sandbox'],
}

chromeCapabilities.set('chromeOptions', chromeOptions);
chromeCapabilities.setPageLoadStrategy('eager');

const driver = new webdriver.Builder()
  .withCapabilities(chromeCapabilities)
  .build();

const url = 'https://itp.ne.jp/genre/?area=13&genre=3&subgenre=70&sort=01&sbmap=false';
const getUrl = async (url) => {
  await driver.get(url);
  await spreadAllList();
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

  const emails = [];
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
  fs.writeFile(path.join(os.homedir(), 'mail-list.txt'), emails.join('\n'), (err) => {
    if (err) {
      console.log('writing error', err);
      return;
    }
    const end = Date.now();
    console.log('write done!', end - start, 'ms');
  });
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

getUrl(url);


// const a = overviewLinks.slice(0, 10);
  // const b = overviewLinks.slice(10, 20);

  // const secondDriver = new webdriver.Builder()
  // .withCapabilities(chromeCapabilities)
  // .build();