export const transformCookieStrToMap = (cookie: string) => {
  const result = new Map<string, string>()
  const arrayCookie = cookie.split(';')

  arrayCookie.forEach((originalValue) => {
    const [key, value] = originalValue.split('=')
    result.set(key, value)
  })

  return result
}
