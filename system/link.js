"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Link = void 0;
const database_1 = require("./database");
class Link {
    apiRun(config, db_port, method = 'GET', api_name = '', path = null, params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            let promise = new Promise((resolve, reject) => {
                const query = `SELECT * FROM _link WHERE link_name = '${api_name}' AND active = 1`;
                const db = new database_1.Database();
                db.execute(config, db_port, query).then((data) => __awaiter(this, void 0, void 0, function* () {
                    if (data.length > 0) {
                        const link = data[0][0];
                        let auth = null;
                        if (link.api_key !== "" && link.api_secret !== "") {
                            auth = {
                                username: link.api_key,
                                password: link.api_secret
                            };
                        }
                        else if (link.api_secret !== "") {
                            auth = {
                                username: link.api_secret
                            };
                        }
                        else if (link.api_key !== "") {
                            auth = {
                                username: link.api_key
                            };
                        }
                        const axios = require('axios');
                        axios.request({
                            method: method.toLowerCase(),
                            url: link.api_url + '/' + path,
                            auth: auth
                        }).then((response) => {
                            resolve(response.data);
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                    else {
                        reject('API Link not found');
                    }
                }), (error) => {
                    reject({ error_type: "USER_PERMISSION_ERROR", error: error });
                });
            });
            return promise;
        });
    }
}
exports.Link = Link;
//# sourceMappingURL=link.js.map