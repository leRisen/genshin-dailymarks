import fs from 'fs-extra'
import cron from 'node-cron'
import fetch from 'node-fetch'
import cookie from 'cookie'
import puppeteer from 'puppeteer'
import randomUserAgent from 'random-useragent'

export interface ClaimReward {
  retcode: number
  message: string
  data: {
    code: string
  } | null
}

export interface DailyStatus {
  retcode: number
  message: string
  data: {
    total_sign_day: number
    today: string
    is_sign: boolean
    first_bind: boolean
    is_sub: boolean
    region: string
  } | null
}

export interface GenshinDailyMarksConfig {
  lang?: string
  actId?: string
  apiURL?: string
  mainURL?: string
}

export class GenshinDailyMarks {
  readonly SELECTOR_AVATAR_ICON = '.mhy-hoyolab-account-block__avatar-icon'

  readonly DEFAULT_HEADERS = {
    'user-agent': randomUserAgent.getRandom((ua) => parseFloat(ua.browserVersion) >= 90) || '',
    Refer: 'https://webstatic-sea.hoyolab.com',
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://webstatic-sea.hoyolab.com',
    Connection: 'keep-alive',
  }

  private lang: string

  private actId: string

  private apiURL: string

  private mainURL: string

  constructor(config?: GenshinDailyMarksConfig) {
    this.lang = config?.lang || 'en'
    this.actId = config?.actId || 'e202102251931481'
    this.apiURL = config?.apiURL || 'https://sg-hk4e-api.hoyolab.com/event/sol'
    this.mainURL = config?.mainURL || 'https://webstatic-sea.hoyolab.com/ys/event/signin-sea-v3/index.html'
  }

  public claimReward = async (cookies: string): Promise<ClaimReward> => {
    const headers = {
      cookie: cookies,
      ...this.DEFAULT_HEADERS,
    }

    return fetch(`${this.apiURL}/sign?lang=${this.lang}`, {
      body: JSON.stringify({ act_id: this.actId }),
      method: 'POST',
      headers,
    })
      .then((response) => response.json())
  }

  public parseCookies = async () => {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    })

    const page = await browser.newPage()
    await page.goto(`${this.mainURL}?act_id=${this.actId}&lang=${this.lang}`)

    await page.waitForSelector(this.SELECTOR_AVATAR_ICON)
    await page.click(this.SELECTOR_AVATAR_ICON)

    await page.waitForResponse(async (response) => {
      if (response.url().startsWith('https://api-account-os.hoyolab.com/auth/api/getUserAccountInfoByLToken') && response.status() === 200) {
        try {
          return await response.json()
            .then((data) => data.message === 'OK')
        } catch (_) {
          return false
        }
      }

      return false
    }, {
      timeout: 0,
    })

    const cookies = await page.cookies()
    await browser.close()

    return cookies.map((data) => `${data.name}=${data.value}`).join('; ')
  }

  public getDailyStatus = async (cookies: string): Promise<DailyStatus> => {
    const headers = {
      cookie: cookies,
      ...this.DEFAULT_HEADERS,
      'Cache-Control': 'max-age=0',
    }

    return fetch(`${this.apiURL}/info?lang=${this.lang}&act_id=${this.actId}`, { headers })
      .then((response) => response.json())
  }

  public isClaimed = async (cookies: string) => this.getDailyStatus(cookies)
    .then((response) => response && response.data ? response.data.is_sign : null)

  /* istanbul ignore next */
  private checkDailyMarks = async (cookies: string, prefix: string = '') => {
    const claimed = await this.isClaimed(cookies)
    if (claimed !== null) {
      if (claimed) {
        console.log(`Reward already claimed when checked at ${new Date().toLocaleString('ru-RU')}`, prefix)
      } else {
        console.log('Reward not claimed yet. Claiming reward...', prefix)
        const response = await this.claimReward(cookies)
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

  public autoCheck = async (filePath = 'tmp/cookies.txt', timezone = 'Etc/GMT-8', cronExpression = '10 0 * * *') => {
    let cookies = ''
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
      cookies = fileBuffer.toString()
      console.log('Successfully loaded cookies from file')
    } else {
      try {
        cookies = await this.parseCookies()
      } catch (error) {
        console.log('Ooopsie... where cookies??')
        throw error
      }

      console.log('Parsed cookies from login')
      console.log(`Writing to file ${filePath}`)
      await fs.outputFile(filePath, cookies)
    }

    const objCookies = cookie.parse(cookies)
    if (!objCookies.hasOwnProperty('account_id')) {
      throw new Error('No authorized account id (cookie)')
    }

    const prefix = `[id: ${objCookies.account_id}]`

    console.log('Start manually check daily marks', prefix)
    await this.checkDailyMarks(cookies, prefix)
    console.log('Schedule cron job', prefix)

    return cron.schedule(cronExpression, async () => {
      /* istanbul ignore next */
      try {
        await this.checkDailyMarks(cookies, prefix)
      } catch (error) {
        console.log('Cron job error', prefix)
        console.error(error)
      }
    }, {
      timezone,
    })
  }
}
