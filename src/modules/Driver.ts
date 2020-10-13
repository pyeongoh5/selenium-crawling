const { Builder } = require('selenium-webdriver');
const { ServiceBuilder } = require('selenium-webdriver/chrome');
const chrome = require('selenium-webdriver/chrome');
const proxy = require('selenium-webdriver/proxy');
const http = require('http');

// const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36";

// const options = {
//   host: "http://127.0.0.1",
//   port: 8080,
//   path: "http://www.google.com",
//   headers: {
//     Host: "www.google.com"
//   }
// };
// http.get(options, function(res) {
//   console.log(res);
//   res.pipe(process.stdout);
// });
// http.createServer(function(req, res) {

//   console.log('Method : ', req.method);
//   console.log('url : ', req.url);
//   console.log('headers : ', req.headers['user-agent']);

//   res.write('Hello World');
//   res.end();
// }).listen(8080);

export class Driver {
	driver;
	constructor(chromeDriverPath: string) {
		console.log('chromeDriverPath', chromeDriverPath);
		const serviceBuilder = new ServiceBuilder(chromeDriverPath);
		this.driver = new Builder()
			.forBrowser('chrome')
			// .setChromeOptions(new chrome.Options().addArguments(["user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36"]))
			.setChromeService(serviceBuilder)
			// .usingServer('http://127.0.0.1:8080')
			// .setProxy(proxy.manual({http: 'http://127.0.0.1:8080'}))
			.build();
	}
	public getDriver() {
		return this.driver;
	}
}
