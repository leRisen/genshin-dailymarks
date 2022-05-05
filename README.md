# Genshin Impact Daily Marks

[![Version](https://img.shields.io/npm/v/genshin-dailymarks.svg)](https://www.npmjs.com/package/genshin-dailymarks)
[![Downloads](https://img.shields.io/npm/dt/genshin-dailymarks.svg)](https://www.npmjs.com/package/genshin-dailymarks)
[![Tests status](https://github.com/discordjs/discord.js/actions/workflows/test.yml/badge.svg)](https://github.com/leRisen/genshin-dailymarks/actions)
[![Codecov Coverage](https://img.shields.io/codecov/c/github/leRisen/genshin-dailymarks/coverage.svg)](https://codecov.io/gh/leRisen/genshin-dailymarks/)

Simple. Flexible. Configurable. Utils with auto check (2 in 1)

> Code base was used similarly (almost) in terms of functionality [python bot](https://github.com/darkGrimoire/hoyolab-daily-bot)

## Install

- `npm install genshin-dailymarks` <> `yarn add genshin-dailymarks`

## Example

```js
const GenshinDailyMarks = require('genshin-dailymarks')

/*
* tmp/cookies.txt - path to file with cookies
* Etc/GMT-8 - timezone for cron job
* 10 0 * * * - cron expression
*/

const genshinDailyMarks = new GenshinDailyMarks()
genshinDailyMarks.autoCheck('tmp/cookies.txt', 'Etc/GMT-8', '10 0 * * *')
```

## Configuration

| Type | Name | Description | Default
| --- | --- | --- | --- |
| String | lang | - | en |
| String | actId | Important parameter (static for everyone, take it from site url) | e202102251931481 |
| String | apiURL | URL for submit requests in API Genshin Impact | https://sg-hk4e-api.hoyolab.com/event/sol |
| String | mainURL | URL with event daily marks | https://webstatic-sea.hoyolab.com/ys/event/signin-sea-v3/index.html |

These keys with values need to be placed in object and passed at `constuctor GenshinDailyMarks`

## Methods

- autoCheck
> Trying to find cookies file, if not exists runs "parseCookies" then once check daily marks and starts cron job

```js
const cron = await genshinDailyMarks.autoCheck(
  /* path to file with cookies */,
  /* timezone for cron job */,
  /* cron expression */,
)
```

- isClaimed
> Check if reward is claimed

```js
const isClaimed = await genshinDailyMarks.isClaimed(/** cookies */)
```

- claimReward
> Claim your reward

```js
const claimReward = await genshinDailyMarks.claimReward(/** cookies */)
```

- parseCookies
> Parse cookies (opens "mainURL" in puppeteer, wait for auth and returns valid cookies string)

```js
const cookies = await genshinDailyMarks.parseCookies()
```

- getDailyStatus
> Get daily status

```js
const dailyStatus = await genshinDailyMarks.getDailyStatus(/** cookies **/)
```
