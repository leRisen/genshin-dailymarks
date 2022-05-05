/* eslint-disable @typescript-eslint/no-unused-vars */
import { Browser, Page } from 'puppeteer'

export const stubPage = {
  goto(url: string) {
    return Promise.resolve()
  },
  click(selector: string) {
    return Promise.resolve()
  },
  cookies() {
    return Promise.resolve()
  },
  waitForSelector(selector: string) {
    return Promise.resolve()
  },
  waitForResponse(urlOrPredicate: string) {
    return Promise.resolve()
  },
} as unknown as Page

export const stubBrowser = {
  newPage() {
    return Promise.resolve(stubPage)
  },
  close() {
    return Promise.resolve()
  },
} as unknown as Browser

export const stubPuppeteer = {
  launch() {
    return Promise.resolve(stubBrowser)
  },
} as unknown as any
