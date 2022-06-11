"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.App = void 0;
const database_1 = require("../system/database");
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
                        reject(err);
                        // throw err;
                    }
                    resolve(server);
                });
            }
            catch (err) {
                console.error("ERROR_ACCESS_TUNNEL_TRY", err);
                reject(err);
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
                reject(error);
            });
        });
        return promise;
    }
    userPermissions(config, db_port, user_id, api) {
        let promise = new Promise((resolve, reject) => {
            const query = `SELECT * FROM _permission WHERE user_id = ${user_id} AND api = '${api}'`;
            const db = new database_1.Database();
            db.execute(config, db_port, query).then((data) => {
                resolve(data);
            }, (error) => {
                reject(error);
            });
        });
        return promise;
    }
}
exports.App = App;
//# sourceMappingURL=app.js.map