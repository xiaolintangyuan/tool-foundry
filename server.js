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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = require("express");
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var dotenv_1 = require("dotenv");
var url_1 = require("url");
dotenv_1.default.config();
var app = (0, express_1.default)();
app.use(express_1.default.json());
var PORT = process.env.GATEWAY_PORT || 3000;
// Build TOOL_MAPPING
var scriptsDir = path_1.default.join(process.cwd(), 'scripts');
var TOOL_MAPPING = {};
var files = fs_extra_1.default.readdirSync(scriptsDir).filter(function (file) { return file.endsWith('.js'); });
for (var _i = 0, files_1 = files; _i < files_1.length; _i++) {
    var file = files_1[_i];
    var filePath = path_1.default.join(scriptsDir, file);
    var module_1 = await Promise.resolve("".concat((0, url_1.pathToFileURL)(filePath).href)).then(function (s) { return require(s); });
    var toolDef = module_1.default;
    if (toolDef && toolDef.name && toolDef.function) {
        TOOL_MAPPING[toolDef.name] = toolDef.function;
    }
}
app.post('/invoke/', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var model, messages, tools, currentMessages, response, payload, apiResponse, message, _i, _a, toolCall, id, func, name_1, argsStr, args, result, error_1;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 11, , 12]);
                model = process.env.LLM_BASEMODEL;
                messages = req.body.messages;
                tools = fs_extra_1.default.readJsonSync('tools.json');
                currentMessages = messages;
                response = void 0;
                _b.label = 1;
            case 1:
                if (!true) return [3 /*break*/, 10];
                payload = {
                    model: model,
                    messages: currentMessages,
                    tools: tools,
                };
                return [4 /*yield*/, fetch("".concat(process.env.LLM_BASEURL, "/chat/completions"), {
                        method: 'POST',
                        headers: {
                            'Authorization': "Bearer ".concat(process.env.LLM_APIKEY),
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(payload),
                    })];
            case 2:
                apiResponse = _b.sent();
                if (!apiResponse.ok) {
                    throw new Error("API error: ".concat(apiResponse.status));
                }
                return [4 /*yield*/, apiResponse.json()];
            case 3:
                response = _b.sent();
                message = response.choices[0].message;
                if (!message.tool_calls) return [3 /*break*/, 8];
                currentMessages.push(message);
                _i = 0, _a = message.tool_calls;
                _b.label = 4;
            case 4:
                if (!(_i < _a.length)) return [3 /*break*/, 7];
                toolCall = _a[_i];
                id = toolCall.id, func = toolCall.function;
                name_1 = func.name, argsStr = func.arguments;
                args = JSON.parse(argsStr);
                return [4 /*yield*/, TOOL_MAPPING[name_1](args)];
            case 5:
                result = _b.sent();
                currentMessages.push({
                    role: 'tool',
                    tool_call_id: id,
                    content: JSON.stringify(result),
                });
                _b.label = 6;
            case 6:
                _i++;
                return [3 /*break*/, 4];
            case 7: return [3 /*break*/, 9];
            case 8: return [3 /*break*/, 10];
            case 9: return [3 /*break*/, 1];
            case 10:
                res.json({ response: response.choices[0].message });
                return [3 /*break*/, 12];
            case 11:
                error_1 = _b.sent();
                res.status(500).json({ error: error_1.message });
                return [3 /*break*/, 12];
            case 12: return [2 /*return*/];
        }
    });
}); });
app.listen(PORT, function () {
    console.log("Server running on port ".concat(PORT));
});
