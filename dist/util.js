"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformCookieStrToMap = void 0;
const transformCookieStrToMap = (cookie) => {
    const result = new Map();
    const arrayCookie = cookie.split(';');
    arrayCookie.forEach((originalValue) => {
        const [key, value] = originalValue.split('=');
        result.set(key, value);
    });
    return result;
};
exports.transformCookieStrToMap = transformCookieStrToMap;
