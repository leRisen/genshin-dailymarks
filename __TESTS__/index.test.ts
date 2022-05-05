import fs from 'fs-extra'
import cookie from 'cookie'
import { EventEmitter } from 'events'
import type { Protocol } from 'puppeteer'

import GenshinDailyMarks from '../src'
import { stubPage, stubBrowser } from '../__MOCKS__/MockPuppeteer'

const STUPID_COOKIE = process.env.COOKIES || ''
const NOT_LOGGED_IN_RESPONSE = {
  data: null,
  message: 'Not logged in',
  retcode: -100,
}

const genshinDailyMarks = new GenshinDailyMarks({
  actId: process.env.ACT_ID,
  apiURL: process.env.API_URL,
})

jest.useFakeTimers()

afterEach(() => {
  jest.resetAllMocks()
})

jest.mock('puppeteer', () => ({
  launch() {
    return stubBrowser
  },
}))

describe('is claimed', () => {
  it('should return boolean when an valid cookie string is passed', async () => {
    const isClaimed = await genshinDailyMarks.isClaimed(STUPID_COOKIE)
    expect(isClaimed).toBeTruthy()
  })

  it('should return null when an invalid cookie string is passed', async () => {
    const isClaimed = await genshinDailyMarks.isClaimed('')
    expect(isClaimed).toBeNull()
  })
})

describe('claim reward', () => {
  it('should return positive or negative data when an valid cookie string is passed', async () => {
    const data = await genshinDailyMarks.claimReward(STUPID_COOKIE)
    expect(data).toHaveProperty('data')
    expect(data).toHaveProperty('message')
    expect(typeof data.message).toBe('string')
    expect(data.message === 'Traveler, you\'ve already checked in today~' || data.message === 'OK').toBeTruthy()
    expect(data).toHaveProperty('retcode')
    expect(typeof data.retcode).toBe('number')
    expect(data.retcode === -5003 || data.retcode === 0).toBeTruthy()
  })

  it('should return "not logged in" response when an invalid cookie string is passed', async () => {
    const data = await genshinDailyMarks.claimReward('')
    expect(data).toMatchObject(NOT_LOGGED_IN_RESPONSE)
  })
})

describe('daily status', () => {
  it('should return data when an valid cookie string is passed', async () => {
    const data = await genshinDailyMarks.getDailyStatus(STUPID_COOKIE)

    expect(data).toHaveProperty('retcode')
    expect(typeof data.retcode).toBe('number')
    expect(data).toHaveProperty('message', 'OK')
    expect(data).toHaveProperty('data')

    expect(data.data === null).toBeFalsy()

    expect(data.data).toHaveProperty('total_sign_day')
    expect(typeof data.data?.total_sign_day).toBe('number')

    expect(data.data).toHaveProperty('today')
    expect(typeof data.data?.today).toBe('string')

    expect(data.data).toHaveProperty('is_sign')
    expect(typeof data.data?.is_sign).toBe('boolean')

    expect(data.data).toHaveProperty('first_bind')
    expect(typeof data.data?.first_bind).toBe('boolean')

    expect(data.data).toHaveProperty('is_sub')
    expect(typeof data.data?.is_sub).toBe('boolean')

    expect(data.data).toHaveProperty('region')
    expect(typeof data.data?.region).toBe('string')
  })

  it('should return "not logged in" response when an invalid cookie string is passed', async () => {
    const data = await genshinDailyMarks.getDailyStatus('')
    expect(data).toMatchObject(NOT_LOGGED_IN_RESPONSE)
  })
})

describe('autoCheck', () => {
  const resolveEmpty = () => Promise.resolve()
  const rejectSomeError = () => Promise.reject(new Error('some error'))

  it('should return error if parse cookies failed', async () => {
    jest.spyOn(stubPage, 'click').mockImplementation(rejectSomeError)
    await expect(genshinDailyMarks.autoCheck())
      .rejects
      .toThrowError('some error')
  })

  it('should return some error (not ENOENT) when an read file', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation(rejectSomeError)
    await expect(genshinDailyMarks.autoCheck())
      .rejects
      .toThrowError('some error')
  })

  it('should return error "No authorized account id (cookie)" when an invalid file is presented', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation(() => Promise.resolve(Buffer.from('foo=bar;')))

    await expect(genshinDailyMarks.autoCheck())
      .rejects
      .toThrowError('No authorized account id (cookie)')
  })

  it('should return error "No authorized account id (cookie)" when an invalid cookie is parsed', async () => {
    jest.spyOn(fs, 'outputFile').mockImplementation(resolveEmpty)
    jest.spyOn(stubPage, 'cookies').mockReturnValue(Promise.resolve(<Protocol.Network.Cookie[]>[{ name: 'foo', value: 'bar' }]))

    await expect(genshinDailyMarks.autoCheck())
      .rejects
      .toThrowError('No authorized account id (cookie)')
  })

  it('should return cron when an valid file is presented', async () => {
    jest.spyOn(fs, 'readFile').mockImplementation(() => Promise.resolve(Buffer.from(STUPID_COOKIE)))
    await expect(genshinDailyMarks.autoCheck())
      .resolves
      .toBeInstanceOf(EventEmitter)
  })

  it('should return cron when an valid cookie is parsed', async () => {
    const arrayCookies = Object.entries(cookie.parse(STUPID_COOKIE)).map(([key, value]) => ({
      name: key,
      value,
    }))

    jest.spyOn(stubPage, 'cookies').mockReturnValue(Promise.resolve(<Protocol.Network.Cookie[]>arrayCookies))
    jest.spyOn(fs, 'outputFile').mockImplementation(resolveEmpty)

    await expect(genshinDailyMarks.autoCheck())
      .resolves
      .toBeInstanceOf(EventEmitter)
  })
})

describe('parseCookies', () => {
  it('should return valid cookie string', async () => {
    jest.spyOn(stubPage, 'cookies').mockReturnValue(Promise.resolve(<Protocol.Network.Cookie[]>[{ name: 'foo', value: 'bar' }]))
    const cookies = await genshinDailyMarks.parseCookies()
    expect(cookies === 'foo=bar').toBeTruthy()
  })
})
