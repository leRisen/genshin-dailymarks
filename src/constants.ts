import randomUserAgent from 'random-useragent'

export const DEFAULT_HEADERS = {
  'user-agent': randomUserAgent.getRandom((ua) => parseFloat(ua.browserVersion) >= 90) || '',
  Refer: 'https://webstatic-sea.hoyolab.com',
  Accept: 'application/json, text/plain, */*',
  Origin: 'https://webstatic-sea.hoyolab.com',
  Connection: 'keep-alive',
}

export const SELECTOR_AVATAR_ICON = '.mhy-hoyolab-account-block__avatar-icon'
