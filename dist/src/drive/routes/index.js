"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../controllers/auth");
const controller_1 = require("../controllers/controller");
const authenticated_1 = require("../../middlewares/authenticated");
const authorized_1 = require("../../middlewares/authorized");
const superAdmin_1 = require("../middlewares/superAdmin");
const router = (0, express_1.Router)();
router.post('/auth/login', auth_1.login);
// ==========================================
// ADMIN ROUTES (Video Upload & Management)
// ==========================================
// 1. Initialize the secure direct upload to Bunny.net
router.post('/upload/init', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.initializeVideoUpload);
// [Placeholder] 2. Standard Drive CRUD operations for the Admin
// An admin needs to be able to fetch the virtual folders and delete mistakes.
router.get('/folders', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.getDriveContents);
router.get('/folders/:folderId', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.getDriveContents);
router.post('/folders', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.createFolder);
router.delete('/folders/:folderId', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.deleteFolder);
router.delete('/files/:videoId', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('admin'), superAdmin_1.requireDriveSuperAdmin, controller_1.deleteVideo);
// ==========================================
// STUDENT/USER ROUTES (Video Playback)
// ==========================================
// 3. Get the secure, expiring HLS streaming URL for the custom React player
// Notice we allow both 'student' and 'admin' here so admins can preview the video.
router.get('/stream/:videoId', authenticated_1.authenticated, (0, authorized_1.authorizeRoles)('student', 'admin'), controller_1.getLessonVideo);
// ==========================================
// PUBLIC WEBHOOK ROUTES (System integrations)
// ==========================================
// 4. The PUBLIC Webhook route for Bunny.net
// Do NOT add 'authenticated' here. Bunny.net handles its own security via the query secret.
router.post('/webhook/bunny', controller_1.handleBunnyWebhook);
exports.default = router;
