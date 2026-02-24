"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Admin schema
__exportStar(require("./schema/admin/admin"), exports);
__exportStar(require("./schema/admin/roles"), exports);
__exportStar(require("./schema/admin/Student"), exports);
__exportStar(require("./schema/admin/parent"), exports);
__exportStar(require("./schema/admin/teacher"), exports);
__exportStar(require("./schema/admin/category"), exports);
__exportStar(require("./schema/admin/courses"), exports);
__exportStar(require("./schema/admin/chapters"), exports);
__exportStar(require("./schema/admin/semester"), exports);
__exportStar(require("./schema/admin/courseTeachers"), exports);
__exportStar(require("./schema/admin/lessons"), exports);
__exportStar(require("./schema/admin/questions"), exports);
__exportStar(require("./schema/admin/examCodes"), exports);
__exportStar(require("./schema/admin/Quiz"), exports);
__exportStar(require("./schema/admin/rawScore"), exports);
__exportStar(require("./schema/admin/diagnosticExam"), exports);
__exportStar(require("./schema/admin/sections"), exports);
__exportStar(require("./schema/admin/exams"), exports);
__exportStar(require("./schema/admin/currency"), exports);
__exportStar(require("./schema/admin/conversionRate"), exports);
__exportStar(require("./schema/admin/Popup"), exports);
__exportStar(require("./schema/admin/SessionRating"), exports);
__exportStar(require("./schema/admin/Session"), exports);
__exportStar(require("./schema/admin/Groups"), exports);
__exportStar(require("./schema/admin/Package"), exports);
__exportStar(require("./schema/admin/Notfication"), exports);
__exportStar(require("./schema/admin/promoCodes"), exports);
