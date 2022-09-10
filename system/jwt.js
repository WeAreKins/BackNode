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
exports.JWT = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../system/database");
const util_1 = require("./util");
class JWT {
    constructor(jwt_token = null) {
        this.JWT_TOKEN = '';
        this.OVERRIDE_KEY = "AXVFHAsyQBiJEcjhHQEcbrdqwZdyIvA8";
        if (jwt_token) {
            this.JWT_TOKEN = jwt_token;
        }
    }
    override(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const date = new Date();
            const dateTime = date.getUTCFullYear() + '-' +
                ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
                ('00' + date.getUTCDate()).slice(-2) + ' ' +
                ('00' + date.getUTCHours()).slice(-2) + ':' +
                ('00' + date.getUTCMinutes()).slice(-2) + ':' +
                ('00');
            if (yield bcryptjs_1.default.compare(this.OVERRIDE_KEY + '|' + dateTime, token)) {
                return true;
            }
            else {
                return false;
            }
        });
    }
    decodeToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const promise = new Promise((resolve, reject) => {
                if (token == null)
                    reject({ code: 401, error: 'Token not found!' });
                (0, jsonwebtoken_1.verify)(token, this.JWT_TOKEN, (err, user) => {
                    if (err)
                        return reject({ code: 403, error: err });
                    resolve(user);
                });
            });
            return promise;
        });
    }
    login(config, db_port, username, password) {
        return __awaiter(this, void 0, void 0, function* () {
            this.JWT_TOKEN = config.jwt_token;
            const promise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    // Validate user input
                    if (!(username && password)) {
                        return reject({ code: 400, error: "All input is required" });
                    }
                    // Validate if user exist in our database
                    const db = new database_1.Database();
                    const query = `SELECT * FROM _user WHERE username = '${username}'`;
                    db.execute(config, db_port, query).then((response) => __awaiter(this, void 0, void 0, function* () {
                        const user = response[0][0];
                        if (user.username && (yield bcryptjs_1.default.compare(password, user.password))) {
                            // Create token
                            const token = (0, jsonwebtoken_1.sign)({ user_id: user.id, username }, this.JWT_TOKEN, {
                                expiresIn: "3600h",
                            });
                            const utilities = new util_1.Util();
                            const query = `UPDATE _user SET token = '${token}', update_on = '${utilities.getCurrentSqlDateTime()}' WHERE _user.id = ${user.id}`;
                            db.execute(config, db_port, query).then((response) => {
                                resolve(token);
                            }, (error) => {
                                reject(error);
                            });
                        }
                        else {
                            reject('invalid credentials');
                        }
                    }), (error) => {
                        reject(error);
                    });
                }
                catch (err) {
                    console.log("JWT_CONNECT_ERROR", err);
                }
            }));
            return promise;
        });
    }
    register(config, db_port, username, password) {
        this.JWT_TOKEN = config.jwt_token;
        const promise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate user input
                if (!(username && password)) {
                    return reject({ code: 400, error: "All input is required" });
                }
                // check if user already exist
                // Validate if user exist in our database
                // const oldUser = await User.findOne({ email });
                // if (oldUser) {
                //     return res.status(409).send("User Already Exist. Please Login");
                // }
                //Encrypt user password
                const encryptedPassword = yield bcryptjs_1.default.hash(password, 10);
                // Create user in our database
                const db = new database_1.Database();
                const utilities = new util_1.Util();
                const query = `INSERT INTO _user (username, password, active, create_on, update_on) VALUES ('${username}', '${encryptedPassword}', 1, '${utilities.getCurrentSqlDateTime()}', '${utilities.getCurrentSqlDateTime()}')`;
                db.execute(config, db_port, query).then((response) => {
                    const token = (0, jsonwebtoken_1.sign)({ user_id: response[0].insertId, username }, this.JWT_TOKEN, {
                        expiresIn: "3600h",
                    });
                    const query_update = `UPDATE _user SET token = '${token}', update_on = '${utilities.getCurrentSqlDateTime()}' WHERE _user.id = ${response[0].insertId}`;
                    db.execute(config, db_port, query_update).then((responseUserUpdate) => {
                        resolve({ token, user_id: response[0].insertId });
                    }, (error) => {
                        reject(error);
                    });
                }, (error) => {
                    reject(error);
                });
            }
            catch (err) {
                reject(err);
            }
        }));
        return promise;
    }
}
exports.JWT = JWT;
//# sourceMappingURL=jwt.js.map