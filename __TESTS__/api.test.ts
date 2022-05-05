import fetch from 'node-fetch'
import { DEFAULT_HEADERS } from '../src/constants'

const ACT_ID = process.env.ACT_ID
const API_URL = process.env.API_URL
const API_LANG = 'en'
const STUPID_COOKIE = process.env.COOKIES || ''

const DAILY_STATUS_URL = `${API_URL}/info?lang=${API_LANG}&act_id=${ACT_ID}`
const CLAIM_REWARD_URL = `${API_URL}/sign?lang=${API_LANG}`

const NOT_LOGGED_IN_RESPONSE = {
  data: null,
  message: 'Not logged in',
  retcode: -100,
}

describe('claim reward', () => {
  const DEFAULT_REQUEST_INIT = {
    body: JSON.stringify({ act_id: ACT_ID }),
    method: 'POST',
  }

  it('should return positive or negative data when a valid cookie string is passed', async () => {
    const data = await fetch(CLAIM_REWARD_URL, {
      ...DEFAULT_REQUEST_INIT,
      headers: {
        cookie: STUPID_COOKIE,
        ...DEFAULT_HEADERS,
      },
    })

    const json = await data.json()

    expect(json).toHaveProperty('data')
    expect(json).toHaveProperty('message')
    expect(typeof json.message).toBe('string')
    expect(json.message === 'Traveler, you\'ve already checked in today~' || json.message === 'OK').toBeTruthy()
    expect(json).toHaveProperty('retcode')
    expect(typeof json.retcode).toBe('number')
    expect(json.retcode === -5003 || json.retcode === 0).toBeTruthy()
  })

  it('should return "not logged in" response when an invalid cookie string is passed', async () => {
    const data = await fetch(CLAIM_REWARD_URL, {
      ...DEFAULT_REQUEST_INIT,
      headers: {
        cookie: '',
        ...DEFAULT_HEADERS,
      },
    })

    const json = await data.json()
    expect(json).toMatchObject(NOT_LOGGED_IN_RESPONSE)
  })
})

describe('daily status', () => {
  it('should return data when a valid cookie string is passed', async () => {
    const data = await fetch(DAILY_STATUS_URL, {
      headers: {
        cookie: STUPID_COOKIE,
        ...DEFAULT_HEADERS,
      },
    })

    const json = await data.json()

    expect(json).toHaveProperty('retcode')
    expect(typeof json.retcode).toBe('number')
    expect(json).toHaveProperty('message', 'OK')
    expect(json).toHaveProperty('data')

    expect(json.data === null).toBeFalsy()

    expect(json.data).toHaveProperty('total_sign_day')
    expect(typeof json.data.total_sign_day).toBe('number')

    expect(json.data).toHaveProperty('today')
    expect(typeof json.data.today).toBe('string')

    expect(json.data).toHaveProperty('is_sign')
    expect(typeof json.data.is_sign).toBe('boolean')

    expect(json.data).toHaveProperty('first_bind')
    expect(typeof json.data.first_bind).toBe('boolean')

    expect(json.data).toHaveProperty('is_sub')
    expect(typeof json.data.is_sub).toBe('boolean')

    expect(json.data).toHaveProperty('region')
    expect(typeof json.data.region).toBe('string')
  })

  it('should return "not logged in" response when an invalid cookie string is passed', async () => {
    const data = await fetch(DAILY_STATUS_URL, {
      headers: {
        cookie: '',
        ...DEFAULT_HEADERS,
      },
    })

    const json = await data.json()
    expect(json).toMatchObject(NOT_LOGGED_IN_RESPONSE)
  })
})
