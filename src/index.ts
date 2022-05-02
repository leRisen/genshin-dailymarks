import fs from 'fs-extra'
import cron from 'node-cron'
import fetch from 'node-fetch'
import puppeteer from 'puppeteer'
import randomUserAgent from 'random-useragent'

import type Config from './types/Config'
import type DailyStatus from './types/DailyStatus'
import type ClaimReward from './types/ClaimReward'

import { transformCookieStrToMap } from './util'

class GenshinDailyMarks {
  readonly SELECTOR_AVATAR_ICON = '.mhy-hoyolab-account-block__avatar-icon'

  readonly DEFAULT_HEADERS = {
    'user-agent': randomUserAgent.getRandom((ua) => parseFloat(ua.browserVersion) >= 90) || '',
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://webstatic-sea.hoyolab.com',
    Connection: 'keep-alive',
  }

  private lang: string

  private actId: string

  private apiURL: string

  private mainURL: string

  constructor(config?: Config) {
    this.lang = config?.lang || 'en'
    this.actId = config?.actId || 'e202102251931481'
    this.apiURL = config?.apiURL || 'https://sg-hk4e-api.hoyolab.com/event/sol'
    this.mainURL = config?.mainURL || 'https://webstatic-sea.hoyolab.com/ys/event/signin-sea-v3/index.html'
  }

  private claimReward = async (cookie: string): Promise<ClaimReward> => {
    const headers = {
      cookie,
      Refer: this.mainURL,
      ...this.DEFAULT_HEADERS,
    }

    return fetch(`${this.apiURL}/sign?lang=${this.lang}`, {
      body: JSON.stringify({ act_id: this.actId }),
      method: 'POST',
      headers,
    })
      .then((response) => response.json())
  }

  private parseCookies = async () => {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    })

    const page = await browser.newPage()
    await page.goto(`${this.mainURL}?act_id=${this.actId}&lang=${this.lang}`)

    await page.waitForSelector(this.SELECTOR_AVATAR_ICON)
    await page.click(this.SELECTOR_AVATAR_ICON)

    await page.waitForResponse((response) => response.url().startsWith('https://api-account-os.hoyolab.com/auth/api/getUserAccountInfoByLToken') && response.status() === 200, {
      timeout: 0,
    })

    const cookies = await page.cookies()
    await browser.close()

    return cookies.map((data) => `${data.name}=${data.value}`).join('; ')
  }

  private getDailyStatus = async (cookie: string): Promise<DailyStatus> => {
    const headers = {
      cookie,
      Refer: this.mainURL,
      ...this.DEFAULT_HEADERS,
      'Cache-Control': 'max-age=0',
    }

    return fetch(`${this.apiURL}/info?lang=${this.lang}&act_id=${this.actId}`, { headers })
      .then((response) => response.json())
  }

  private isClaimed = async (cookie: string) => this.getDailyStatus(cookie)
    .then((response) => response && response.data ? response.data.is_sign : null)

  private checkDailyMarks = async (cookie: string, prefix: string = '') => {
    const claimed = await this.isClaimed(cookie)
    if (claimed !== null) {
      if (claimed) {
        console.log(`Reward already claimed when checked at ${new Date().toLocaleString('ru-RU')}`, prefix)
      } else {
        console.log('Reward not claimed yet. Claiming reward...', prefix)
        const response = await this.claimReward(cookie)
        if (response) {
          console.log(`Reward claimed at ${new Date().toLocaleString('ru-RU')}`, prefix)
          console.log('Claiming complete! message:', response.message, prefix)
        }
      }

      console.log('Reward has been claimed!', prefix)
    } else {
      console.log('Failed to check if reward is claimed... retrying later', prefix)
    }
  }

  private autoCheck = async (filePath = 'tmp/cookies.txt', timezone = 'Etc/GMT-8', cronExpression = '10 0 * * *') => {
    let cookie = ''
    let fileBuffer

    try {
      fileBuffer = await fs.readFile(filePath)
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('File with cookies not found')
      } else {
        throw error
      }
    }

    if (fileBuffer) {
      cookie = fileBuffer.toString()
      console.log('Successfully loaded cookies from file')
    } else {
      try {
        cookie = await this.parseCookies()
      } catch (error) {
        console.log('Ooopsie... where cookies??')
        throw error
      }

      console.log('Parsed cookies from login')
      console.log(`Writing to file ${filePath}`)
      await fs.outputFile(filePath, cookie)
    }

    const accountId = transformCookieStrToMap(cookie).get('account_id')
    if (!accountId) {
      throw new Error('No authorized account id (cookie)')
    }

    const prefix = `[id: ${accountId}]`

    console.log('Start manually check daily marks', prefix)
    await this.checkDailyMarks(cookie, prefix)
    console.log('Schedule cron job', prefix)

    return cron.schedule(cronExpression, async () => {
      try {
        await this.checkDailyMarks(cookie, prefix)
      } catch (error) {
        console.log('Cron job error', prefix)
        console.error(error)
      }
    }, {
      timezone,
    })
  }
}

export default GenshinDailyMarks
module.exports = GenshinDailyMarks
