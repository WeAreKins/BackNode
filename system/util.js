"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Util = void 0;
class Util {
    response(success, result, timestamp = Math.floor(Date.now() / 1000)) {
        return {
            success,
            result,
            timestamp
        };
    }
    getCurrentSqlDateTime() {
        const date = new Date();
        const dateTime = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        return dateTime;
    }
}
exports.Util = Util;
//# sourceMappingURL=util.js.map