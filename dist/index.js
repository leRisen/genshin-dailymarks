"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_cron_1 = __importDefault(require("node-cron"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const puppeteer_1 = __importDefault(require("puppeteer"));
const random_useragent_1 = __importDefault(require("random-useragent"));
class GenshinDailyMarks {
    constructor(config) {
        this.DEFAULT_HEADERS = {
            'user-agent': random_useragent_1.default.getRandom((ua) => parseFloat(ua.browserVersion) >= 90) || '',
            Accept: 'application/json, text/plain, */*',
            Origin: 'https://webstatic-sea.hoyolab.com',
            Connection: 'keep-alive',
        };
        this.claimReward = (cookie) => __awaiter(this, void 0, void 0, function* () {
            const headers = Object.assign({ cookie, Refer: this.mainURL }, this.DEFAULT_HEADERS);
            try {
                return yield (0, node_fetch_1.default)(`${this.apiURL}/sign?lang=${this.lang}`, {
                    body: JSON.stringify({ act_id: this.actId }),
                    method: 'POST',
                    headers,
                })
                    .then((response) => response.json());
            }
            catch (error) {
                console.error(error);
                return null;
            }
        });
        this.parseCookies = () => __awaiter(this, void 0, void 0, function* () {
            const browser = yield puppeteer_1.default.launch({
                headless: false,
                defaultViewport: null,
                args: ['--start-maximized'],
            });
            const page = yield browser.newPage();
            yield page.goto(`${this.mainURL}?act_id=${this.actId}&lang=${this.lang}`);
            yield page.waitForResponse((response) => response.url().startsWith('https://api-account-os.hoyolab.com/auth/api/getUserAccountInfoByLToken') && response.status() === 200, {
                timeout: 0,
            });
            const cookies = yield page.cookies();
            yield browser.close();
            return cookies.map((data) => `${data.name}=${data.value}`).join('; ');
        });
        this.getDailyStatus = (cookie) => __awaiter(this, void 0, void 0, function* () {
            const headers = Object.assign(Object.assign({ cookie, Refer: this.mainURL }, this.DEFAULT_HEADERS), { 'Cache-Control': 'max-age=0' });
            try {
                return yield (0, node_fetch_1.default)(`${this.apiURL}/info?lang=${this.lang}&act_id=${this.actId}`, { headers })
                    .then((response) => response.json());
            }
            catch (error) {
                console.error(error);
                return null;
            }
        });
        this.isClaimed = (cookie) => __awaiter(this, void 0, void 0, function* () {
            return this.getDailyStatus(cookie)
                .then((response) => response && response.data ? response.data.is_sign : null);
        });
        this.checkDailyMarks = (cookie) => __awaiter(this, void 0, void 0, function* () {
            const claimed = yield this.isClaimed(cookie);
            if (claimed !== null) {
                if (claimed) {
                    console.log(`Reward already claimed when checked at ${new Date().toLocaleString('ru-RU')}`);
                }
                else {
                    console.log('Reward not claimed yet. Claiming reward...');
                    const response = yield this.claimReward(cookie);
                    if (response) {
                        console.log(`Reward claimed at ${new Date().toLocaleString('ru-RU')}`);
                        console.log('Claiming complete! message:', response.message);
                    }
                }
                console.log('Reward has been claimed!');
            }
            else {
                console.log('There was an error... retrying later');
            }
        });
        this.autoCheck = (cookiesFileName = 'tmp/cookies.txt', timezone = 'Etc/GMT-8', cronExpression = '10 0 * * *') => __awaiter(this, void 0, void 0, function* () {
            let cookie = '';
            const fileBuffer = yield fs_extra_1.default.readFile(cookiesFileName).catch(() => null);
            if (fileBuffer) {
                cookie = fileBuffer.toString();
                console.log('Successfully loaded cookies from file');
            }
            else {
                try {
                    cookie = yield this.parseCookies();
                }
                catch (error) {
                    console.log('Ooopsie... where cookies??');
                    console.error(error);
                    return;
                }
                console.log('Parsed cookies from login');
                console.log(`Writing to file ${cookiesFileName}`);
                yield fs_extra_1.default.outputFile(cookiesFileName, cookie).catch((error) => console.error(error));
            }
            console.log('Start manually check daily marks');
            yield this.checkDailyMarks(cookie);
            console.log('Schedule cron job (every day)');
            return node_cron_1.default.schedule(cronExpression, () => this.checkDailyMarks(cookie), {
                timezone,
            });
        });
        this.lang = (config === null || config === void 0 ? void 0 : config.lang) || 'ru';
        this.actId = (config === null || config === void 0 ? void 0 : config.actId) || 'e202102251931481';
        this.apiURL = (config === null || config === void 0 ? void 0 : config.apiURL) || 'https://sg-hk4e-api.hoyolab.com/event/sol';
        this.mainURL = (config === null || config === void 0 ? void 0 : config.mainURL) || 'https://webstatic-sea.hoyolab.com/ys/event/signin-sea-v3/index.html';
    }
}
exports.default = GenshinDailyMarks;
module.exports = GenshinDailyMarks;
