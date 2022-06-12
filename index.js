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
const express_1 = __importDefault(require("express"));
const util_1 = require("./system/util");
const database_1 = require("./system/database");
const app_1 = require("./system/app");
const jwt_1 = require("./system/jwt");
const { exec } = require('child_process');
const cors_1 = __importDefault(require("cors"));
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)(corsOptions));
app.use(bodyParser.json());
const PORT = process.env.PORT || 2225;
const utilities = new util_1.Util();
const db = new database_1.Database();
const application = new app_1.App();
app.get("/", (req, res) => {
    res.send(utilities.response(true, "Hello BackNode!"));
});
app.post("/", (req, res) => {
    const os = require('os');
    res.send(utilities.response(true, {
        os: os.platform(),
        release: os.release(),
        arch: os.arch(),
        host: os.hostname(),
        type: os.type()
    }));
});
app.post("/app/access", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (backConfig.over_ssh) {
        if (application.sshTunnel) {
            try {
                application.sshTunnel.close();
            }
            catch (error) {
                console.log('ERROR_SSH_TUNNEL_CLOSE', error);
            }
        }
        application.access(backConfig, PORT).then(success => {
            res.send(utilities.response(true, "Access success"));
        }, error => {
            res.send(utilities.response(false, error));
        });
    }
    else {
        res.send(utilities.response(true, "Access success"));
    }
}));
app.post("/app/init", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (backConfig.over_ssh) {
        application.init(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port).then(success => {
            res.send(utilities.response(true, ""));
        }, error => {
            res.send(utilities.response(false, error));
        });
    }
    else {
        res.send(utilities.response(true, ""));
    }
}));
app.post("/app/collections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    /**
     * JWT Permission
     */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    let user_id = 0;
    const override = jwt.override(token);
    if (!override) {
        const user = yield jwt.decodeToken(token).catch((error) => {
            return res.send(utilities.response(false, error));
        });
        if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
            return res.send(utilities.response(false, "Unable to find user."));
        }
        else {
            user_id = user.user_id;
        }
    }
    // JWT Permission
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh === 1) {
            const success = yield application.access(backConfig, PORT);
        }
    }
    let query = '';
    switch (backConfig.db_type) {
        case 'mssql':
            query = `SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_catalog = '${backConfig.db_name}'`;
            break;
        case 'mysql':
            query = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${backConfig.db_name}'`;
            break;
        case 'oracle':
            query = `SELECT table_name FROM user_tables`;
            break;
        case 'pg':
            query = `SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_catalog = '${backConfig.db_name}'`;
            break;
        case 'sqlite':
        default:
            query = `SELECT name AS table_name FROM sqlite_master WHERE type='table'`;
            break;
    }
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        result = result[0];
        result = result.map((row) => row.TABLE_NAME);
        res.send(utilities.response(true, result));
    }, (error) => {
        console.log(error);
        res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_DB', error: error }));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
app.post("/app/query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, sql } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json').catch((error) => {
            console.log("ERROR_CONFIG_FILE", error);
        });
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, sql).then((result) => {
        res.send(utilities.response(true, result));
    }, (error) => {
        res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_DB', error: error }));
    });
}));
app.post("/app/deploy", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config } = req.body;
    if (!config) {
        return res.send(utilities.response(false, 'config not found'));
    }
    /**
    * JWT Permission
    */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(config.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    let user_id = 0;
    const override = yield jwt.override(token);
    if (!override) {
        const user = yield jwt.decodeToken(token).catch((error) => {
            return res.send(utilities.response(false, error));
        });
        if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
            return res.send(utilities.response(false, "Unable to find user."));
        }
        else {
            user_id = user.user_id;
        }
    }
    // JWT Permission
    if (user_id < 1) {
        return res.send(utilities.response(false, { e_title: 'ERROR_NO_USER_ID', error: 'unable to find user.' }));
    }
    const user_path = user_id;
    const user_cdn_path = path.resolve(__dirname, 'cdn', `${user_path}`);
    const user_cdn_service_path = path.resolve(user_cdn_path, 'back-node');
    if (!fs.existsSync(user_cdn_path)) {
        fs.mkdirSync(user_cdn_path);
    }
    const fse = require('fs-extra');
    fs.rmSync(path.resolve(user_cdn_path), { recursive: true, force: true });
    yield fse.copy(path.resolve(process.cwd(), 'dist'), path.resolve(user_cdn_service_path), { overwrite: true });
    let dataConfig = yield fs.writeFile(path.resolve(user_cdn_service_path, 'environment.json'), JSON.stringify(config), (err) => {
        // return res.send(utilities.response(false, err));
    });
    const archiver = require('archiver');
    const zip_path = path.resolve(user_cdn_path, `back-node.zip`);
    const output = fs.createWriteStream(zip_path);
    const archive = archiver('zip');
    output.on('close', function () {
        return res.send(utilities.response(true, {
            path: `${user_path}/back-node.zip`,
            size: archive.pointer()
        }));
    });
    archive.on('error', function (err) {
        // return res.send(utilities.response(false, err));
    });
    archive.pipe(output);
    // append files from a sub-directory, putting its contents at the root of archive
    archive.directory(user_cdn_service_path, false);
    archive.finalize();
}));
/**
 * Custom API Endpoints
 * Method: GET
 *
 */
app.get("/cdn/:user_id/:file_name", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { user_id, file_name } = req.params;
    /**
     * JWT Permission
     */
    // const authHeader = req.headers['authorization'];
    // let token = authHeader && authHeader.split(' ')[1];
    // const jwt = new JWT();
    // if (typeof token === 'undefined') {
    //     return res.send(utilities.response(false, {
    //         code: 401,
    //         error: 'Token not found!'
    //     }));
    // }
    // const user: any = await jwt.decodeToken(token).catch((error: any) => {
    //     return res.send(utilities.response(false, error));
    // });
    // if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
    //     return res.send(utilities.response(false, "Unable to find user."));
    // }
    // JWT Permission
    const file = `${__dirname}/cdn/${user_id}/${file_name}`;
    return res.download(file); // Set disposition and send it.
}));
app.post("/user/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, username, password } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    jwt.login(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, username, password).then((response) => {
        return res.send(utilities.response(true, response));
    }, (error) => {
        return res.send(utilities.response(false, error));
    });
}));
app.post("/user/register", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, username, password } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    jwt.register(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, username, password).then((response) => {
        return res.send(utilities.response(true, response));
    }, (error) => {
        return res.send(utilities.response(false, error));
    });
}));
app.post("/user/exist", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, username } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const query = `SELECT id from _user WHERE username = '${username}'`;
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        res.send(utilities.response(true, result));
    }, (error) => {
        res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_DB', error: error }));
    });
}));
app.get("/user", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { db_type, db_name, db_host, db_port, db_user, db_pass, over_ssh, ssh_host, ssh_port, ssh_user, ssh_pass, jwt_token } = req.query;
    let backConfig;
    if (db_type) {
        backConfig = {
            db_type: db_type,
            db_name: db_name,
            db_host: db_host,
            db_port: parseInt(db_port, 10),
            db_user: db_user,
            db_pass: db_pass,
            over_ssh: parseInt(over_ssh),
            ssh_host: ssh_host,
            ssh_port: parseInt(ssh_port),
            ssh_user: ssh_user,
            ssh_pass: ssh_pass,
            jwt_token: jwt_token
        };
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    /**
    * JWT Permission
    */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    let user_id = 0;
    const override = yield jwt.override(token);
    if (!override) {
        const user = yield jwt.decodeToken(token).catch((error) => {
            return res.send(utilities.response(false, error));
        });
        if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
            return res.send(utilities.response(false, "Unable to find user."));
        }
        else {
            user_id = user.user_id;
        }
    }
    // JWT Permission
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    if (user_id < 1) {
        return res.send(utilities.response(false, { e_title: 'ERROR_NO_USER_ID', error: 'unable to find user.' }));
    }
    const query = `SELECT id, username, create_on FROM _user WHERE _user.id = ${user_id}`;
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        if (result[0].length > 0) {
            res.send(utilities.response(true, result[0][0]));
        }
        else {
            res.send(utilities.response(false, { e_title: 'ERROR_NO_USER', error: 'user not found' }));
        }
    }, (error) => {
        res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_DB', error: error }));
    });
}));
/**
 * Retrive Data
 *
 * @limit
 * @offset
 * @where: key =|!=|>|<|>=|<= value AND|OR key =|!=|>|<|>=|<= value
 *
 */
app.get("/data/:table?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { limit, offset, where, fields, db_type, db_name, db_host, db_port, db_user, db_pass, over_ssh, ssh_host, ssh_port, ssh_user, ssh_pass, jwt_token, } = req.query;
    let backConfig;
    if (db_type) {
        backConfig = {
            db_type: db_type,
            db_name: db_name,
            db_host: db_host,
            db_port: parseInt(db_port, 10),
            db_user: db_user,
            db_pass: db_pass,
            over_ssh: parseInt(over_ssh),
            ssh_host: ssh_host,
            ssh_port: parseInt(ssh_port),
            ssh_user: ssh_user,
            ssh_pass: ssh_pass,
            jwt_token: jwt_token
        };
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    /**
     * JWT Permission
     */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    let user_id = 0;
    const override = jwt.override(token);
    if (!override) {
        const user = yield jwt.decodeToken(token).catch((error) => {
            return res.send(utilities.response(false, error));
        });
        if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
            return res.send(utilities.response(false, "Unable to find user."));
        }
        else {
            user_id = user.user_id;
        }
    }
    // JWT Permission
    const { table } = req.params;
    if (!table) {
        return res.send(utilities.response(false, {
            title: "Collection (Table) not defined",
            error: {
                help: "Use table name after data eg: http://localhost/data/{table_name}"
            }
        }));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh === 1) {
            const success = yield application.access(backConfig, PORT);
        }
    }
    // User permission check
    if (!override) {
        const permission = yield application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, user_id, '/data/' + table);
        if (typeof permission[0][0] === 'undefined' || permission[0][0].length < 1 || permission[0][0].level < 1) {
            return res.send(utilities.response(false, 'Unauthorised'));
        }
    }
    // User Permission
    if (!fields) {
        fields = '*';
    }
    let query = `SELECT ${fields} FROM ${table}`;
    if (where) {
        query += ` WHERE ${where}`;
    }
    if (limit) {
        query += ` LIMIT ${limit}`;
    }
    if (offset) {
        query += ` OFFSET ${offset}`;
    }
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        res.send(utilities.response(true, result[0]));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
/**
 * Retrive Data
 * @set = { table column name: value}
 *
 */
app.post("/data/:table?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { set, where, config } = req.body;
    let backConfig;
    let query = '';
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    /**
     * JWT Permission
     */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    let user_id = 0;
    const override = jwt.override(token);
    if (!override) {
        const user = yield jwt.decodeToken(token).catch((error) => {
            return res.send(utilities.response(false, error));
        });
        if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
            return res.send(utilities.response(false, "Unable to find user."));
        }
        else {
            user_id = user.user_id;
        }
    }
    // JWT Permission
    const { table } = req.params;
    if (!table) {
        res.send(utilities.response(false, {
            title: "Collection (Table) not defined",
            error: {
                help: "Use table name after data eg: http://localhost/data/{table_name}"
            }
        }));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    // User permission check
    if (!override) {
        const permission = yield application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, user_id, '/data/' + table);
        if (typeof permission[0][0] === 'undefined' || permission[0][0].length < 1 || permission[0][0].level < 1) {
            return res.send(utilities.response(false, 'Unauthorised'));
        }
    }
    // User Permission
    if (where) {
        let set_fields = [];
        Object.keys(set).forEach((key) => {
            set_fields.push(key + " = '" + set[key] + "'");
        });
        query = `UPDATE ${table} SET ${set_fields} WHERE ${where}`;
    }
    else {
        let set_values = [];
        Object.values(set).forEach((value, idx) => {
            set_values.push("'" + value + "'");
        });
        query = `INSERT INTO ${table} (${Object.keys(set)}) VALUES (${set_values})`;
    }
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        res.send(utilities.response(true, result[0]));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
/**
 * Custom API Endpoints
 * Method: GET
 *
 */
app.get("/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    let { db_type, db_name, db_host, db_port, db_user, db_pass, over_ssh, ssh_host, ssh_port, ssh_user, ssh_pass, jwt_token } = req.query;
    let backConfig;
    if (db_type) {
        backConfig = {
            db_type: db_type,
            db_name: db_name,
            db_host: db_host,
            db_port: parseInt(db_port, 10),
            db_user: db_user,
            db_pass: db_pass,
            over_ssh: parseInt(over_ssh),
            ssh_host: ssh_host,
            ssh_port: parseInt(ssh_port),
            ssh_user: ssh_user,
            ssh_pass: ssh_pass,
            jwt_token: jwt_token,
        };
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    /**
     * JWT Permission
     */
    const authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    const jwt = new jwt_1.JWT(backConfig.jwt_token);
    if (typeof token === 'undefined') {
        return res.send(utilities.response(false, {
            code: 401,
            error: 'Token not found!'
        }));
    }
    const user = yield jwt.decodeToken(token).catch((error) => {
        return res.send(utilities.response(false, error));
    });
    if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
        return res.send(utilities.response(false, "Unable to find user."));
    }
    // JWT Permission
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    // User permission check
    const permission = yield application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, 1, '/' + endpoint);
    if (typeof permission[0][0] === 'undefined' || permission[0][0].length < 1 || permission[0][0].level < 2) {
        return res.send(utilities.response(false, 'Unauthorised'));
    }
    let query = `SELECT * FROM _api WHERE endpoint = '${endpoint}' AND method = 'get'`;
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (result[0].length > 0) {
            if (result[0][0].public !== 1) {
                /**
                 * JWT Permission
                 */
                const authHeader = req.headers['authorization'];
                let token = authHeader && authHeader.split(' ')[1];
                const jwt = new jwt_1.JWT(backConfig.jwt_token);
                if (typeof token === 'undefined') {
                    return res.send(utilities.response(false, {
                        code: 401,
                        error: 'Token not found!'
                    }));
                }
                const user = yield jwt.decodeToken(token).catch((error) => {
                    return res.send(utilities.response(false, error));
                });
                if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
                    return res.send(utilities.response(false, "Unable to find user."));
                }
                // JWT Permission
            }
            const variables = result[0][0].action.match(/\{\{(.*?)\}\}/g);
            if (variables && variables.length > 0) {
                Object.keys(variables).forEach((key) => {
                    let variable = variables[key].replace('{{', "");
                    variable = variable.replace('}}', "");
                    if (!req.query[variable]) {
                        res.send(utilities.response(false, `Parameter '${variable}' is missing`));
                    }
                    result[0][0].action = result[0][0].action.replace(variables[key], req.query[variable]);
                });
            }
            db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, result[0][0].action).then((result) => {
                res.send(utilities.response(true, result[0]));
            }, (error) => {
                res.send(utilities.response(false, error));
            });
        }
        else {
            res.send(utilities.response(false, "API endpoint not found!"));
        }
    }), (error) => {
        res.send(utilities.response(false, error));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
/**
 * Custom API Endpoints
 * Method: POST
 *
 */
app.post("/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { endpoint } = req.params;
    const { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync('environment.json')) {
        let dataConfig = yield fs.readFileSync('environment.json');
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    if (application.sshTunnel === null) {
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    // User permission check
    const permission = yield application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, 1, '/' + endpoint);
    if (typeof permission[0][0] === 'undefined' || permission[0][0].length < 1 || permission[0][0].level < 2) {
        return res.send(utilities.response(false, 'Unauthorised'));
    }
    let query = `SELECT * FROM _api WHERE endpoint = '${endpoint}' AND method = 'post'`;
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (result[0].length > 0) {
            if (result[0][0].public !== 1) {
                /**
                 * JWT Permission
                 */
                const authHeader = req.headers['authorization'];
                let token = authHeader && authHeader.split(' ')[1];
                const jwt = new jwt_1.JWT(backConfig.jwt_token);
                if (typeof token === 'undefined') {
                    return res.send(utilities.response(false, {
                        code: 401,
                        error: 'Token not found!'
                    }));
                }
                const user = yield jwt.decodeToken(token).catch((error) => {
                    return res.send(utilities.response(false, error));
                });
                if (typeof user === 'undefined' || typeof user.user_id === 'undefined') {
                    return res.send(utilities.response(false, "Unable to find user."));
                }
                // JWT Permission
            }
            const variables = result[0][0].action.match(/\{\{(.*?)\}\}/g);
            if (variables.length > 0) {
                Object.keys(variables).forEach((key) => {
                    let variable = variables[key].replace('{{', "");
                    variable = variable.replace('}}', "");
                    if (!req.body[variable]) {
                        res.send(utilities.response(false, `Parameter '${variable}' is missing`));
                    }
                    result[0][0].action = result[0][0].action.replace(variables[key], req.body[variable]);
                });
            }
            db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, result[0][0].action).then((result) => {
                res.send(utilities.response(true, result[0]));
            }, (error) => {
                res.send(utilities.response(false, error));
            });
        }
        else {
            res.send(utilities.response(false, "API endpoint not found!"));
        }
    }), (error) => {
        res.send(utilities.response(false, error));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
app.listen(PORT, () => {
    console.log(`Server Running here 👉 http://localhost:${PORT}`);
});
//# sourceMappingURL=index.js.map