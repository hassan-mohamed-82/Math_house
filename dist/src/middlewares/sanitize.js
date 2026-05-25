"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeRequest = void 0;
const sanitizeString = (value) => {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/[<>]/g, "");
};
const sanitizeValue = (value) => {
    if (typeof value === "string") {
        return sanitizeString(value);
    }
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)]));
    }
    return value;
};
const mutateObject = (target, source) => {
    for (const key of Object.keys(target)) {
        delete target[key];
    }
    Object.assign(target, source);
};
const sanitizeRequest = (req, _res, next) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeValue(req.body);
    }
    if (req.query && typeof req.query === "object") {
        mutateObject(req.query, sanitizeValue(req.query));
    }
    if (req.params && typeof req.params === "object") {
        mutateObject(req.params, sanitizeValue(req.params));
    }
    next();
};
exports.sanitizeRequest = sanitizeRequest;
