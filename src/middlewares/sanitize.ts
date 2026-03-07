import { NextFunction, Request, Response } from "express";

const sanitizeString = (value: string): string => {
    return value
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/javascript:/gi, "")
        .replace(/on\w+\s*=/gi, "")
        .replace(/[<>]/g, "");
};

const sanitizeValue = (value: unknown): unknown => {
    if (typeof value === "string") {
        return sanitizeString(value);
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)])
        );
    }

    return value;
};

const mutateObject = (target: Record<string, unknown>, source: Record<string, unknown>) => {
    for (const key of Object.keys(target)) {
        delete target[key];
    }

    Object.assign(target, source);
};

export const sanitizeRequest = (req: Request, _res: Response, next: NextFunction) => {
    if (req.body && typeof req.body === "object") {
        req.body = sanitizeValue(req.body) as Request["body"];
    }

    if (req.query && typeof req.query === "object") {
        mutateObject(req.query as Record<string, unknown>, sanitizeValue(req.query) as Record<string, unknown>);
    }

    if (req.params && typeof req.params === "object") {
        mutateObject(req.params as Record<string, unknown>, sanitizeValue(req.params) as Record<string, unknown>);
    }

    next();
};