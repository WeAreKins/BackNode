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
exports.Database = void 0;
class Database {
    execute(config, db_port, query) {
        const promise = new Promise((resolve, reject) => {
            let knex;
            knex = this.connect_stream(config.db_type, config.db_name, config.db_host, db_port, config.db_user, config.db_pass);
            knex.raw(query).then(function (results) {
                knex.destroy();
                resolve(results);
            }, (error) => {
                knex.destroy();
                reject(error);
            });
        });
        return promise;
    }
    connect_stream(db_type, db_name, db_host, db_port, db_user, db_pass) {
        let knex = null;
        switch (db_type) {
            case 'mysql':
            case 'mariadb':
                try {
                    knex = require('knex')({
                        client: 'mysql2',
                        connection: {
                            host: db_host,
                            port: db_port,
                            user: db_user,
                            password: db_pass,
                            database: db_name,
                            multipleStatements: true
                        }
                    });
                }
                catch (con_stream_error) {
                    console.log("EXECUTE_CONSTREAM_ERROR", con_stream_error);
                }
                break;
            case 'mssql':
                try {
                    knex = require('knex')({
                        client: 'tedious',
                        connection: {
                            host: db_host,
                            port: db_port,
                            user: db_user,
                            password: db_pass,
                            database: db_name,
                        }
                    });
                }
                catch (con_stream_error) {
                    console.log("EXECUTE_CONSTREAM_ERROR", con_stream_error);
                }
                break;
            case 'pg':
            case 'cockroachdb':
            case 'redshift':
                knex = require('knex')({
                    client: 'pg',
                    connection: {
                        host: db_host,
                        port: db_port,
                        user: db_user,
                        password: db_pass,
                        database: db_name,
                    }
                });
                break;
            default:
                // SQLite
                knex = require('knex')({
                    client: 'better-sqlite3',
                    connection: {
                        host: db_host,
                        port: db_port,
                        user: db_user,
                        password: db_pass,
                        database: db_name,
                    }
                });
                break;
        }
        return knex;
    }
    collectionInit(config, db_port) {
        const promise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let knex;
            knex = this.connect_stream(config.db_type, config.db_name, config.db_host, db_port, config.db_user, config.db_pass);
            const queries = [];
            const exist_api = yield knex.schema.hasTable('_api');
            if (!exist_api) {
                queries.push(knex.schema.createTable('_api', function (table) {
                    table.increments();
                    table.text('method');
                    table.text('endpoint');
                    table.text('action');
                    table.text('type');
                    table.integer('public').defaultTo(0);
                    table.integer('active');
                    table.datetime('create_on');
                    table.datetime('update_on');
                }));
            }
            const exist_user = yield knex.schema.hasTable('_user');
            if (!exist_user) {
                queries.push(knex.schema.createTable('_user', function (table) {
                    table.increments();
                    table.text('username');
                    table.text('password');
                    table.text('token');
                    table.integer('active');
                    table.datetime('create_on');
                    table.datetime('update_on');
                }));
            }
            const exist_permission = yield knex.schema.hasTable('_permission');
            if (!exist_permission) {
                queries.push(knex.schema.createTable('_permission', function (table) {
                    table.increments();
                    table.text('api');
                    table.integer('user_id');
                    table.integer('level');
                    table.integer('active');
                    table.datetime('create_on');
                    table.datetime('update_on');
                }));
            }
            const exist_config = yield knex.schema.hasTable('_config');
            if (!exist_config) {
                queries.push(knex.schema.createTable('_config', function (table) {
                    table.string('config').primary();
                    table.text('value');
                }));
            }
            if (queries.length > 0) {
                const multiQuery = queries.join(";");
                knex.raw(multiQuery).then((results) => {
                    knex.destroy();
                    resolve(results[0]);
                }).catch((error) => {
                    console.log("COLLECTION_INIT_DB_ERROR", error);
                    knex.destroy();
                    reject(error);
                });
            }
            else {
                resolve({});
            }
        }));
        return promise;
    }
    createUser(config, db_port, username, password) {
        const promise = new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            let knex;
            knex = this.connect_stream(config.db_type, config.db_name, config.db_host, db_port, config.db_user, config.db_pass);
            const query = `INSET INTO _user SET (username, password, active, create_on, update_on) VALUES ('${username}', '${password}', 1)`;
            knex.raw(query).then((results) => {
                knex.destroy();
                resolve(results[0]);
            }).catch((error) => {
                console.log("CREATE_USER_DB_ERROR", error);
                knex.destroy();
                reject(error);
            });
        }));
        return promise;
    }
}
exports.Database = Database;
//# sourceMappingURL=database.js.map