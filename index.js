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
const link_1 = require("./system/link");
const mailer_1 = require("./system/mailer");
const cors_1 = __importDefault(require("cors"));
const { exec } = require('child_process');
const fs = require('fs');
const bodyParser = require('body-parser');
const path = require('path');
const os = require('os');
const cron = require('node-cron');
const util = require('util');
var log_file = fs.createWriteStream(path.resolve(os.tmpdir(), 'backnode_debug.log'), { flags: 'w' });
var log_stdout = process.stdout;
process.on('uncaughtException', function (err) {
    log_file.write(util.format(err) + '\n');
    log_stdout.write(util.format(err) + '\n');
    process.exit(1);
});
console.log = function (d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
};
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
};
const app = (0, express_1.default)();
app.use((0, cors_1.default)(corsOptions));
app.use(bodyParser.json({ limit: '120mb' }));
const PORT = process.env.PORT || 2225;
const utilities = new util_1.Util();
const db = new database_1.Database();
const application = new app_1.App();
application.scheduleTaskInit();
app.get("/", (req, res) => {
    res.send(utilities.response(true, "Hello BackNode!"));
});
app.post("/", (req, res) => {
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
    let envPath = null;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
            let query = `select version();`;
            switch (backConfig.db_type) {
                case 'mssql':
                    query = `select @@VERSION as system_version`;
                    break;
                case 'oracle':
                    query = `select version() as system_version`;
                    break;
                case 'pg':
                    query = `select version() as system_version`;
                    break;
                case 'sqlite':
                default:
                    query = `select version() as system_version`;
                    break;
            }
            db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
                res.send(utilities.response(true, result));
            }, (error) => {
                res.send(utilities.response(false, error));
            });
        }, error => {
            res.send(utilities.response(false, error));
        });
    }
    else {
        let query = `select version();`;
        switch (backConfig.db_type) {
            case 'mssql':
                query = `select @@VERSION as system_version`;
                break;
            case 'oracle':
                query = `select version() as system_version`;
                break;
            case 'pg':
                query = `select version() as system_version`;
                break;
            case 'sqlite':
            default:
                query = `select version() as system_version`;
                break;
        }
        db.execute(backConfig, backConfig.db_port, query).then((result) => {
            res.send(utilities.response(true, result));
        }, (error) => {
            res.send(utilities.response(false, error));
        });
    }
}));
app.post("/app/init", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, local_env } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
        if (local_env) {
            fs.writeFileSync(path.resolve(os.tmpdir(), 'environment.json'), JSON.stringify(config));
        }
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    application.scheduleTaskInit();
    application.init(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port).then(success => {
        res.send(utilities.response(true, ""));
    }, error => {
        res.send(utilities.response(false, error));
    });
}));
app.post("/app/collections", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
            query = `SELECT table_name FROM information_schema.tables WHERE table_catalog = '${backConfig.db_name}'`;
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
        switch (backConfig.db_type) {
            case 'mssql':
                result = result.map((row) => row.table_name);
                break;
            case 'mysql':
                result = result[0];
                result = result.map((row) => row.TABLE_NAME);
                break;
            case 'oracle':
                break;
            case 'pg':
                break;
            case 'sqlite':
            default:
                break;
        }
        res.send(utilities.response(true, result));
    }, (error) => {
        console.log("COLLECTION_DATA_FETCH_ERROR", error);
        res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_DB', error: error }));
    });
    // }, error => {
    //     res.send(utilities.response(false, { e_title: 'ERROR_BACK_APP_ACCESS', error: error }));
    // });
}));
app.post("/app/query", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config, sql, paramerters } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else {
        return res.send(utilities.response(false, 'app configuration not found'));
    }
    const variables = sql.match(/\{\{(.*?)\}\}/g);
    if (variables && variables.length > 0) {
        Object.keys(variables).forEach((key) => {
            let variable = variables[key].replace('{{', "");
            variable = variable.replace('}}', "");
            let value = null;
            if (variable.indexOf(":") > 0) {
                const variableSplit = variable.split(":");
                value = (typeof variableSplit[1] !== 'undefined') ? variableSplit[1] : null;
                variable = variableSplit[0];
            }
            else if (typeof paramerters[variable] === "undefined") {
                res.send(utilities.response(false, `Parameter '${variable}' is missing`));
            }
            if (value === null && typeof paramerters[variable] !== "undefined") {
                value = req.body[variable];
            }
            sql = sql.replace(variables[key], value);
        });
    }
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, sql).then((result) => {
        if (backConfig.db_type === 'mysql') {
            result = result[0];
        }
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
    let dataConfig = yield fs.writeFile(path.resolve(user_cdn_service_path, path.resolve(process.cwd(), 'environment.json')), JSON.stringify(config), (err) => {
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
app.post("/app/mailer", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, smtp_config, from, to, subject, text, html } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const mailer = new mailer_1.Mailer();
    mailer.send(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, smtp_config, from, to, subject, text, html).then((response) => {
        return res.send(utilities.response(true, response));
    }, (error) => {
        return res.send(utilities.response(false, error));
    });
}));
app.post("/app/schedule/start", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config, schedule_job } = req.body;
    let backConfig;
    let query = '';
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const cronStr = `${schedule_job.minute} ${schedule_job.hour} ${schedule_job.day} ${schedule_job.month} ${schedule_job.weekday}`;
    let job = cron.schedule(cronStr, () => {
        application.scheduleTaskLog(schedule_job.id, null, null, utilities.getCurrentSqlDateTime(), null, null).then((schedule_id) => {
            exec(schedule_job.command, (error, stdout, stderr) => {
                if (error) {
                    application.scheduleTaskLog(schedule_job.id, null, error.message, null, utilities.getCurrentSqlDateTime(), schedule_id);
                    return;
                }
                if (stderr) {
                    application.scheduleTaskLog(schedule_job.id, null, stderr, null, utilities.getCurrentSqlDateTime(), schedule_id);
                    return;
                }
                application.scheduleTaskLog(schedule_job.id, stdout, null, null, utilities.getCurrentSqlDateTime(), schedule_id);
            });
        });
    }, {
        scheduled: false
    });
    job.start();
    return res.send(utilities.response(true, 'schedule job started'));
}));
app.post("/app/schedule/stop", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config, schedule_job } = req.body;
    let backConfig;
    let query = '';
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const cronStr = `${schedule_job.minute} ${schedule_job.hour} ${schedule_job.day} ${schedule_job.month} ${schedule_job.weekday}`;
    let job = cron.schedule(cronStr, () => { });
    job.stop();
    return res.send(utilities.response(true, 'schedule job stoped'));
}));
app.post("/app/command", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config, command } = req.body;
    let backConfig;
    let query = '';
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.send(utilities.response(true, error));
        }
        if (stderr) {
            return res.send(utilities.response(true, stderr));
        }
        return res.send(utilities.response(true, stdout));
    });
}));
app.post("/user/login", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { config, username, password } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    // const query = `SELECT id from _user WHERE username = '${username}'`
    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
    let query = knex('_user')
        .select('id')
        .where('username', username)
        .toString();
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    // const query = `SELECT id, username, create_on FROM _user WHERE _user.id = ${user_id}`;
    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
    let query = knex('_user')
        .select('id, username, create_on')
        .where('_user.id', user_id)
        .toString();
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        if (backConfig.db_type === 'mysql') {
            result = result[0];
        }
        if (result.length > 0) {
            res.send(utilities.response(true, result[0]));
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
    let { limit, offset, where, fields, order_by, db_type, db_name, db_host, db_port, db_user, db_pass, over_ssh, ssh_host, ssh_port, ssh_user, ssh_pass, jwt_token, } = req.query;
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (permission.length > 0 && permission[0].level < 1) {
            return res.send(utilities.response(false, 'Unauthorised'));
        }
    }
    // User Permission
    if (!fields && typeof fields === 'undefined') {
        fields = '*';
    }
    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
    let query = knex(table).select(fields);
    if (typeof where !== 'undefined') {
        query.whereRaw(where);
    }
    if (typeof limit !== 'undefined') {
        query.limit(limit);
    }
    if (typeof offset !== 'undefined') {
        query.offset(offset);
    }
    if (typeof order_by !== 'undefined') {
        query.orderByRaw(order_by);
    }
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query.toString()).then((result) => {
        if (backConfig.db_type === 'mysql') {
            result = result[0];
        }
        res.send(utilities.response(true, result));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (permission.length > 0 && permission[0].level < 1) {
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
            if (value === null || value === 'null') {
                set_values.push("null");
            }
            else {
                set_values.push("'" + value + "'");
            }
        });
        query = `INSERT INTO ${table} (${Object.keys(set)}) VALUES (${set_values})`;
        if (backConfig.db_type === 'mssql') {
            query += `; SELECT SCOPE_IDENTITY() as insertId`;
        }
    }
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => {
        result = result[0];
        res.send(utilities.response(true, result));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
}));
/**
 * Link API
 * Method: GET
 *
 */
app.get("/link/:api_name/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { db_type, db_name, db_host, db_port, db_user, db_pass, over_ssh, ssh_host, ssh_port, ssh_user, ssh_pass, jwt_token, } = req.query;
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const { api_name, endpoint } = req.params;
    const link = new link_1.Link();
    link.apiRun(backConfig, PORT, 'GET', api_name, endpoint, req.query).then((data) => {
        res.send(utilities.response(true, data));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
}));
/**
* Link API
* Method: POST
*
*/
app.post("/link/:api_name/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const { api_name, endpoint } = req.params;
    const link = new link_1.Link();
    link.apiRun(config, PORT, 'POST', api_name, endpoint, req.body).then((data) => {
        res.send(utilities.response(true, data));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
}));
/**
* Link API
* Method: PUT
*
*/
app.put("/link/:api_name/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const { api_name, endpoint } = req.params;
    const link = new link_1.Link();
    link.apiRun(config, PORT, 'PUT', api_name, endpoint, req.body).then((data) => {
        res.send(utilities.response(true, data));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
}));
/**
* Link API
* Method: PUT
*
*/
app.patch("/link/:api_name/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const { api_name, endpoint } = req.params;
    const link = new link_1.Link();
    link.apiRun(config, PORT, 'PATCH', api_name, endpoint, req.body).then((data) => {
        res.send(utilities.response(true, data));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
}));
/**
* Link API
* Method: DELETE
*
*/
app.delete("/link/:api_name/:endpoint(*)?", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    let { config } = req.body;
    let backConfig;
    if (config) {
        backConfig = config;
    }
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
        if (backConfig.over_ssh) {
            const success = yield application.access(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port);
        }
    }
    const { api_name, endpoint } = req.params;
    const link = new link_1.Link();
    link.apiRun(config, PORT, 'DELETE', api_name, endpoint, req.body).then((data) => {
        res.send(utilities.response(true, data));
    }, (error) => {
        res.send(utilities.response(false, error));
    });
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    let permission = yield application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, 1, '/' + endpoint);
    if (backConfig.db_type === 'mysql') {
        permission = permission[0];
    }
    if (permission.length > 0 && permission[0].level < 2) {
        return res.send(utilities.response(false, 'Unauthorised'));
    }
    // let query = `SELECT * FROM _api WHERE endpoint = '${endpoint}' AND method = 'get'`;
    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
    let query = knex('_api')
        .select('*')
        .where('endpoint', endpoint)
        .where('method', 'get')
        .where('active', 1)
        .toString();
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (backConfig.db_type === 'mysql') {
            result = result[0];
        }
        if (result.length > 0) {
            if (result[0].public !== 1) {
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
            const variables = result[0].action.match(/\{\{(.*?)\}\}/g);
            if (variables && variables.length > 0) {
                Object.keys(variables).forEach((key) => {
                    let variable = variables[key].replace('{{', "");
                    variable = variable.replace('}}', "");
                    ;
                    let value = null;
                    if (variable.indexOf(":") > 0) {
                        const variableSplit = variable.split(":");
                        value = (typeof variableSplit[1] !== 'undefined' && variableSplit[1] !== '') ? variableSplit[1] : null;
                        variable = variableSplit[0];
                    }
                    else if (!req.query[variable]) {
                        res.send(utilities.response(false, `Parameter '${variable}' is missing`));
                    }
                    if (value === null && req.query[variable]) {
                        value = req.query[variable];
                    }
                    else {
                        value = '';
                    }
                    result[0].action = result[0].action.replace(variables[key], value);
                });
            }
            db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, result[0].action).then((result) => {
                if (backConfig.db_type === 'mysql') {
                    result = result[0];
                }
                res.send(utilities.response(true, result));
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
    else if (fs.existsSync(path.resolve(process.cwd(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(process.cwd(), 'environment.json'));
        backConfig = JSON.parse(dataConfig);
    }
    else if (fs.existsSync(path.resolve(os.tmpdir(), 'environment.json'))) {
        let dataConfig = yield fs.readFileSync(path.resolve(os.tmpdir(), 'environment.json'));
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
    // let permission: any = await application.userPermissions(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, 1, '/' + endpoint);
    // if (backConfig.db_type === 'mysql') {
    //     permission = permission[0];
    // }
    // if (typeof permission[0] !== 'undefined' && permission.length > 0 && permission[0].level < 2) {
    //     return res.send(utilities.response(false, 'Unauthorised'));
    // }
    // let query = `SELECT * FROM _api WHERE endpoint = '${endpoint}' AND method = 'post'`;
    const knex = db.connect_stream(backConfig.db_type, backConfig.db_name, backConfig.db_host, backConfig.db_port, backConfig.db_user, backConfig.db_pass);
    let query = knex('_api')
        .select('*')
        .where('endpoint', endpoint)
        .where('method', 'post')
        .toString();
    // application.access(backConfig, PORT).then(server => {
    db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, query).then((result) => __awaiter(void 0, void 0, void 0, function* () {
        if (backConfig.db_type === 'mysql') {
            result = result[0];
        }
        if (result.length > 0) {
            if (result[0].public !== 1) {
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
            const variables = result[0].action.match(/\{\{(.*?)\}\}/g);
            if (variables && variables.length > 0) {
                Object.keys(variables).forEach((key) => {
                    let variable = variables[key].replace('{{', "");
                    variable = variable.replace('}}', "");
                    let value = null;
                    if (variable.indexOf(":") > 0) {
                        const variableSplit = variable.split(":");
                        value = (typeof variableSplit[1] !== 'undefined' && variableSplit[1] !== '') ? variableSplit[1] : null;
                        variable = variableSplit[0];
                    }
                    else if (!req.query[variable]) {
                        res.send(utilities.response(false, `Parameter '${variable}' is missing`));
                    }
                    if (value === null && req.query[variable]) {
                        value = req.query[variable];
                    }
                    else {
                        value = '';
                    }
                    result[0].action = result[0].action.replace(variables[key], value);
                });
            }
            db.execute(backConfig, backConfig.over_ssh === 1 ? PORT : backConfig.db_port, result[0].action).then((result) => {
                if (backConfig.db_type === 'mysql') {
                    result = result[0];
                }
                res.send(utilities.response(true, result));
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
}));
app.listen(PORT, () => {
    console.log(`Server Running here 👉 http://localhost:${PORT}`);
    console.log("Temp Dir: " + os.tmpdir());
});
//# sourceMappingURL=index.js.map