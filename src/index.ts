import fs from 'fs-extra'
import cron from 'node-cron'
import fetch from 'node-fetch'
import puppeteer from 'puppeteer'
import randomUserAgent from 'random-useragent'

import type Config from 'types/Config'
import type DailyStatus from 'types/DailyStatus'
import type ClaimReward from 'types/ClaimReward'

class GenshinDailyMarks {
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
    this.lang = config?.lang || 'ru'
    this.actId = config?.actId || 'e202102251931481'
    this.apiURL = config?.apiURL || 'https://sg-hk4e-api.hoyolab.com/event/sol'
    this.mainURL = config?.mainURL || 'https://webstatic-sea.hoyolab.com/ys/event/signin-sea-v3/index.html'
  }

  private claimReward = async (cookie: string): Promise<ClaimReward | null> => {
    const headers = {
      cookie,
      Refer: this.mainURL,
      ...this.DEFAULT_HEADERS,
    }

    try {
      return await fetch(`${this.apiURL}/sign?lang=${this.lang}`, {
        body: JSON.stringify({ act_id: this.actId }),
        method: 'POST',
        headers,
      })
        .then((response) => response.json())
    } catch (error) {
      console.error(error)
      return null
    }
  }

  private parseCookies = async () => {
    const browser = await puppeteer.launch({
      headless: false,
      defaultViewport: null,
      args: ['--start-maximized'],
    })

    const page = await browser.newPage()
    await page.goto(`${this.mainURL}?act_id=${this.actId}&lang=${this.lang}`)

    await page.waitForResponse((response) => response.url().startsWith('https://api-account-os.hoyolab.com/auth/api/getUserAccountInfoByLToken') && response.status() === 200, {
      timeout: 0,
    })

    const cookies = await page.cookies()
    await browser.close()

    return cookies.map((data) => `${data.name}=${data.value}`).join('; ')
  }

  private getDailyStatus = async (cookie: string): Promise<DailyStatus | null> => {
    const headers = {
      cookie,
      Refer: this.mainURL,
      ...this.DEFAULT_HEADERS,
      'Cache-Control': 'max-age=0',
    }

    try {
      return await fetch(`${this.apiURL}/info?lang=${this.lang}&act_id=${this.actId}`, { headers })
        .then((response) => response.json())
    } catch (error) {
      console.error(error)
      return null
    }
  }

  private isClaimed = async (cookie: string) => this.getDailyStatus(cookie)
    .then((response) => response ? response.data?.is_sign || false : null)

  private checkDailyMarks = async (cookie: string) => {
    const claimed = await this.isClaimed(cookie)
    if (claimed !== null) {
      if (claimed) {
        console.log(`Reward already claimed when checked at ${new Date().toLocaleString('ru-RU')}`)
      } else {
        console.log('Reward not claimed yet. Claiming reward...')
        const response = await this.claimReward(cookie)
        if (response) {
          console.log(`Reward claimed at ${new Date().toLocaleString('ru-RU')}`)
          console.log('Claiming complete! message:', response.message)
        }
      }

      console.log('Reward has been claimed!')
    } else {
      console.log('There was an error... retrying later')
    }
  }

  private autoCheck = async (cookiesFileName = 'tmp/cookies.txt', timezone = 'Etc/GMT-8', cronExpression = '10 0 * * *') => {
    let cookie = ''

    const fileBuffer = await fs.readFile(cookiesFileName).catch(() => null)
    if (fileBuffer) {
      cookie = fileBuffer.toString()
      console.log('Successfully loaded cookies from file')
    } else {
      try {
        cookie = await this.parseCookies()
      } catch (error) {
        console.log('Ooopsie... where cookies??')
        console.error(error)
        return
      }

      console.log('Parsed cookies from login')
      console.log(`Writing to file ${cookiesFileName}`)
      await fs.outputFile(cookiesFileName, cookie).catch((error) => console.error(error))
    }

    console.log('Start manually check daily marks')
    await this.checkDailyMarks(cookie)
    console.log('Schedule cron job (every day)')

    return cron.schedule(cronExpression, () => this.checkDailyMarks(cookie), {
      timezone,
    })
  }
}

export default GenshinDailyMarks
