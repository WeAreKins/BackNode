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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Link = void 0;
const database_1 = require("./database");
const qs_1 = __importDefault(require("qs"));
class Link {
    apiRun(config, db_port, method = 'GET', api_name = '', path = null, queryParams = {}, bodyParams = null, contentType = 'application/json') {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = new Promise((resolve, reject) => {
                const db = new database_1.Database();
                const knex = db.connect_stream(config.db_type, config.db_name, config.db_host, config.db_port, config.db_user, config.db_pass);
                const query = knex('_link')
                    .select('*')
                    .where('link_name', api_name)
                    .where('active', 1)
                    .toString();
                db.execute(config, db_port, query).then((data) => __awaiter(this, void 0, void 0, function* () {
                    if (data.length > 0) {
                        const link = data[0][0];
                        if (contentType === null) {
                            contentType = 'application/json';
                        }
                        let auth = null;
                        if (link.auth_method === 'bearer' || link.auth_method === 'basic') {
                            if (link.api_key !== '' && link.api_secret !== '') {
                                auth = {
                                    username: link.api_key,
                                    password: link.api_secret
                                };
                            }
                            else if (link.api_secret !== '') {
                                auth = {
                                    username: link.api_secret
                                };
                            }
                            else if (link.api_key !== '') {
                                auth = {
                                    username: link.api_key
                                };
                            }
                            const axios = require('axios');
                            axios.request({
                                method: method.toLowerCase(),
                                url: link.api_url + '/' + path,
                                auth,
                                headers: {
                                    'Content-Type': contentType
                                },
                                params: queryParams !== null ? queryParams : [],
                                data: bodyParams !== null ? bodyParams : []
                            }).then((response) => {
                                resolve(response.data);
                            }).catch((error) => {
                                reject(error);
                            });
                        }
                        else if (link.auth_method === 'oauth2') {
                            const axios = require('axios');
                            let auth2 = JSON.parse(link.oauth2_config);
                            const d = new Date();
                            if (auth2.expiry < d.getTime()) {
                                auth2 = (yield this.getAuth2RefreshToken(config, db_port, api_name));
                            }
                            axios.request({
                                method: method.toLowerCase(),
                                url: link.api_url + '/' + path,
                                headers: {
                                    Authorization: `${auth2.header_prefix ? auth2.header_prefix : 'Bearer'} ${auth2.access_token}`,
                                    // 'Content-Type': contentType
                                },
                                params: queryParams !== null ? queryParams : [],
                                data: bodyParams !== null ? bodyParams : []
                            }).then((response) => {
                                resolve(response.data);
                            }).catch((error) => {
                                reject(error);
                            });
                        }
                    }
                    else {
                        reject('API Link not found');
                    }
                }), (error) => {
                    reject({ error_type: 'USER_PERMISSION_ERROR', error });
                });
            });
            return promise;
        });
    }
    getAuth2AccessToken(config, db_port, api_name = '', code = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = new Promise((resolve, reject) => {
                const db = new database_1.Database();
                const knex = db.connect_stream(config.db_type, config.db_name, config.db_host, config.db_port, config.db_user, config.db_pass);
                const query = knex('_link')
                    .select('*')
                    .where('link_name', api_name)
                    .where('active', 1)
                    .toString();
                db.execute(config, db_port, query).then((data) => __awaiter(this, void 0, void 0, function* () {
                    if (data.length > 0) {
                        const link = data[0][0];
                        const auth2 = JSON.parse(link.oauth2_config);
                        const axios = require('axios');
                        axios.request({
                            method: 'post',
                            url: auth2.access_url,
                            params: {
                                client_id: link.api_key,
                                client_secret: link.api_secret,
                                code,
                                grant_type: 'authorization_code',
                                redirect_uri: auth2.redirect_url
                            },
                            // eslint-disable-next-line prefer-arrow/prefer-arrow-functions, object-shorthand
                            paramsSerializer: function (params) {
                                return qs_1.default.stringify(params, { arrayFormat: 'brackets' });
                            }
                        }).then((response) => {
                            const auth2Response = response.data;
                            auth2.access_token = auth2Response.access_token;
                            auth2.refresh_token = auth2Response.refresh_token;
                            const d = new Date();
                            const time = d.getTime();
                            auth2.expiry = time + (auth2Response.expires_in * 1000);
                            const queryUpdateAuth2Data = knex('_link')
                                .set('oauth2_config', JSON.stringify(auth2))
                                .where('ID', link.ID)
                                .toString();
                            db.execute(config, db_port, queryUpdateAuth2Data).then((responseUpdateAuth2) => __awaiter(this, void 0, void 0, function* () {
                                resolve(auth2);
                            }));
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                    else {
                        reject('API Link not found');
                    }
                }), (error) => {
                    reject({ error_type: 'USER_PERMISSION_ERROR', error });
                });
            });
            return promise;
        });
    }
    getAuth2RefreshToken(config, db_port, api_name = '') {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = new Promise((resolve, reject) => {
                const db = new database_1.Database();
                const knex = db.connect_stream(config.db_type, config.db_name, config.db_host, config.db_port, config.db_user, config.db_pass);
                const query = knex('_link')
                    .select('*')
                    .where('link_name', api_name)
                    .where('active', 1)
                    .toString();
                db.execute(config, db_port, query).then((data) => __awaiter(this, void 0, void 0, function* () {
                    if (data.length > 0) {
                        const link = data[0][0];
                        const auth2 = JSON.parse(link.oauth2_config);
                        /**
                         * `?client_id=${link.api_key}&client_secret=${link.api_secret}
                         * &refresh_token=${auth2.refresh_token}&grant_type=refresh_token`
                         */
                        const axios = require('axios');
                        axios.request({
                            method: 'post',
                            url: auth2.access_url,
                            params: {
                                client_id: link.api_key,
                                client_secret: link.api_secret,
                                refresh_token: auth2.refresh_token,
                                grant_type: 'refresh_token'
                            },
                            // eslint-disable-next-line prefer-arrow/prefer-arrow-functions, object-shorthand
                            paramsSerializer: function (params) {
                                return qs_1.default.stringify(params, { arrayFormat: 'brackets' });
                            }
                        }).then((response) => {
                            const auth2Response = response.data;
                            auth2.access_token = auth2Response.access_token;
                            const d = new Date();
                            const time = d.getTime();
                            auth2.expiry = time + (auth2Response.expires_in * 1000);
                            const queryUpdateAuth2Data = knex('_link')
                                .update({ oauth2_config: JSON.stringify(auth2) })
                                .where('id', link.id)
                                .toString();
                            db.execute(config, db_port, queryUpdateAuth2Data).then((responseUpdateAuth2) => __awaiter(this, void 0, void 0, function* () {
                                resolve(auth2);
                            }));
                        }).catch((error) => {
                            reject(error);
                        });
                    }
                    else {
                        reject('API Link not found');
                    }
                }), (error) => {
                    reject({ error_type: 'USER_PERMISSION_ERROR', error });
                });
            });
            return promise;
        });
    }
}
exports.Link = Link;
//# sourceMappingURL=link.js.map