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
exports.App = void 0;
const child_process_1 = require("child_process");
const database_1 = require("../system/database");
const util_1 = require("./util");
const fs = require('fs');
const path = require('path');
const os = require('os');
var cron = require('node-cron');
class App {
    constructor() {
        this.sshTunnel = null;
    }
    access(config, local_port) {
        let promise = new Promise((resolve, reject) => {
            const tunnel = require('tunnel-ssh');
            let sshConfig = {
                host: config.ssh_host,
                port: config.ssh_port,
                username: config.ssh_user,
                password: config.ssh_pass,
                keepaliveInterval: 60000,
                keepAlive: true,
                dstHost: config.db_host,
                dstPort: config.db_port,
                localHost: 'localhost',
                localPort: local_port
            };
            try {
                this.sshTunnel = tunnel(sshConfig, (err, server) => {
                    if (err) {
                        console.error("ERROR_ACCESS_TUNNEL", err);
                        reject({ error_type: "ERROR_ACCESS_TUNNEL", error: err });
                        // throw err;
                    }
                    resolve(server);
                    /**
                     * Do Not Remove this code, the application will close unexpcted on connectivity issue.
                     */
                    server.on('error', function (err) {
                        console.error('ERROR_ACCESS_TUNNEL_SERVER:', err);
                    });
                });
            }
            catch (err) {
                console.error("ERROR_ACCESS_TUNNEL_TRY", err);
                reject({ error_type: "ERROR_ACCESS_TUNNEL_TRY", error: err });
            }
        });
        return promise;
    }
    init(config, db_port) {
        let promise = new Promise((resolve, reject) => {
            const db = new database_1.Database();
            db.collectionInit(config, db_port).then(data => {
                resolve(data);
            }, error => {
                reject({ error_type: "CONNECTION_INIT_ERROR", error: error });
            });
        });
        return promise;
    }
    userPermissions(config, db_port, user_id, api) {
        let promise = new Promise((resolve, reject) => {
            const query = `SELECT * FROM _permission WHERE user_id = ${user_id} AND api = '${api}' AND active = 1`;
            const db = new database_1.Database();
            db.execute(config, db_port, query).then((data) => {
                if (config.db_type === 'mysql') {
                    data = data[0];
                }
                resolve(data);
            }, (error) => {
                reject({ error_type: "USER_PERMISSION_ERROR", error: error });
            });
        });
        return promise;
    }
    scheduleTaskInit() {
        return __awaiter(this, void 0, void 0, function* () {
            let backConfig = null;
            const utilities = new util_1.Util();
            if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
                let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
                backConfig = JSON.parse(dataConfig);
            }
            else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
                let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
                backConfig = JSON.parse(dataConfig);
            }
            if (backConfig) {
                if (this.sshTunnel === null) {
                    if (backConfig.over_ssh) {
                        try {
                            const success = yield this.access(backConfig, backConfig.over_ssh === 1 ? 2225 : backConfig.db_port);
                        }
                        catch (e) {
                            console.log(e);
                            return false;
                        }
                    }
                }
                // const query = `SELECT * FROM _scheduler WHERE active = 1`;
                const db = new database_1.Database();
                const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
                const query = knex('_scheduler')
                    .select('*')
                    .where('active', 1)
                    .toString();
                db.execute(backConfig, backConfig.over_ssh === 1 ? 2225 : backConfig.db_port, query).then((result) => {
                    if (backConfig.db_type === 'mysql') {
                        result = result[0];
                    }
                    if (result.length > 0) {
                        result.forEach((element) => {
                            const cronStr = `${element.minute} ${element.hour} ${element.day} ${element.month} ${element.weekday}`;
                            if (cron.validate(cronStr)) {
                                let job = cron.schedule(cronStr, () => {
                                    this.scheduleTaskLog(element.id, null, null, utilities.getCurrentSqlDateTime(), null, null).then((schedule_id) => {
                                        (0, child_process_1.exec)(element.command, (error, stdout, stderr) => {
                                            if (error) {
                                                this.scheduleTaskLog(element.id, null, error.message, null, utilities.getCurrentSqlDateTime(), schedule_id);
                                                return;
                                            }
                                            if (stderr) {
                                                this.scheduleTaskLog(element.id, null, stderr, null, utilities.getCurrentSqlDateTime(), schedule_id);
                                                return;
                                            }
                                            this.scheduleTaskLog(element.id, stdout, null, null, utilities.getCurrentSqlDateTime(), schedule_id);
                                        });
                                    });
                                });
                                job.start();
                            }
                            else {
                            }
                        });
                    }
                    else {
                    }
                }, (error) => {
                });
            }
        });
    }
    scheduleTaskLog(schedule_id, response = null, error = null, start_on = null, end_on = null, scheduler_log_id = null) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                let backConfig = null;
                if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
                    let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
                    backConfig = JSON.parse(dataConfig);
                }
                else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
                    let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
                    backConfig = JSON.parse(dataConfig);
                }
                if (backConfig) {
                    if (this.sshTunnel === null) {
                        if (backConfig.over_ssh) {
                            const success = yield this.access(backConfig, backConfig.over_ssh === 1 ? 2225 : backConfig.db_port);
                        }
                    }
                    const db = new database_1.Database();
                    const utilities = new util_1.Util();
                    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
                    let query = null;
                    if (scheduler_log_id) {
                        query = knex('_scheduler_log')
                            .where('id', scheduler_log_id)
                            .update({
                            scheduler_id: schedule_id,
                            response,
                            error,
                            end_on,
                            update_on: utilities.getCurrentSqlDateTime()
                        }).toString();
                    }
                    else {
                        query = knex('_scheduler_log')
                            .insert({
                            scheduler_id: schedule_id,
                            response,
                            error,
                            start_on,
                            end_on,
                            active: 1,
                            create_on: utilities.getCurrentSqlDateTime(),
                            update_on: utilities.getCurrentSqlDateTime()
                        }).toString();
                    }
                    if (!scheduler_log_id && backConfig.db_type === 'mssql') {
                        query += `; SELECT SCOPE_IDENTITY() as insertId`;
                    }
                    db.execute(backConfig, backConfig.over_ssh === 1 ? 2225 : backConfig.db_port, query).then((result) => {
                        if (result.length > 0) {
                            if (scheduler_log_id) {
                                resolve(scheduler_log_id);
                            }
                            else {
                                resolve(result[0].insertId);
                            }
                        }
                        else {
                        }
                    }, (error) => {
                        console.log('SCHEDULE_TASK_LOG_ERROR', error);
                        reject(error);
                    });
                }
            }));
        });
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map