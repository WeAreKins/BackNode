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
exports.Mailer = void 0;
const database_1 = require("./database");
const nodemailer = require("nodemailer");
class Mailer {
    send(config, db_port, smtpConfig = null, from, to, subject, text, html) {
        return new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
            const db = new database_1.Database();
            if (!smtpConfig) {
                const result = yield db.getConfig(config, db_port, 'SMTP');
                if (result && result.length > 0) {
                    smtpConfig = JSON.parse(result[0].value);
                }
                else {
                    reject('SMTP not configured');
                }
            }
            if (smtpConfig) {
                let transporter = nodemailer.createTransport({
                    host: smtpConfig.host,
                    port: smtpConfig.port,
                    secure: (smtpConfig.secure === 1 || smtpConfig.secure === '1') ? true : false,
                    auth: {
                        user: smtpConfig.auth_user,
                        pass: smtpConfig.auth_pass,
                    },
                    priority: smtpConfig.priority,
                    html: (smtpConfig.html === 1 || smtpConfig.html === '1') ? true : false
                });
                if (from === null || typeof from === 'undefined') {
                    from = smtpConfig.email;
                }
                transporter.sendMail({
                    from,
                    to,
                    subject,
                    text,
                    html,
                }, function (error, info) {
                    if (error) {
                        reject(error);
                    }
                    resolve(info);
                });
            }
            else {
                reject('SMTP not configured');
            }
        }));
    }
}
exports.Mailer = Mailer;
//# sourceMappingURL=mailer.js.map