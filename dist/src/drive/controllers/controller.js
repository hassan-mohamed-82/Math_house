"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVideo = exports.getLessonVideo = exports.handleBunnyWebhook = exports.deleteFolder = exports.createFolder = exports.getDriveContents = exports.initializeVideoUpload = void 0;
const drizzle_orm_1 = require("drizzle-orm");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const services_1 = require("../services/services");
const initializeVideoUpload = async (req, res) => {
    try {
        const { videoTitle, folderId } = req.body;
        if (!videoTitle || typeof videoTitle !== 'string' || !videoTitle.trim()) {
            throw new BadRequest_1.BadRequest('Video title is required');
        }
        if (folderId) {
            const [existingFolder] = await connection_1.db.select()
                .from(schema_1.driveFolders)
                .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.id, folderId));
            if (!existingFolder) {
                throw new Errors_1.NotFound('Folder not found');
            }
        }
        // 1. Create the placeholder in Bunny to get the GUID (Video ID)
        const trimmedVideoTitle = videoTitle.trim();
        const videoId = await (0, services_1.createBunnyVideoEntry)(trimmedVideoTitle);
        // 2. Generate the secure TUS signature for the browser
        const uploadCredentials = (0, services_1.generateTusUploadCredentials)(videoId);
        // 3. Save the initial record to your database
        await connection_1.db.insert(schema_1.driveAssets).values({
            title: trimmedVideoTitle,
            type: 'video',
            status: 'uploading',
            folderId,
            bunnyGuid: videoId,
        });
        // 4. Return everything the frontend needs
        return (0, response_1.SuccessResponse)(res, {
            message: 'Ready for direct browser upload',
            uploadCredentials,
        }, 200);
    }
    catch (error) {
        if (error instanceof BadRequest_1.BadRequest || error instanceof Errors_1.NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('[Drive Controller] Error initializing upload:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.initializeVideoUpload = initializeVideoUpload;
const getDriveContents = async (req, res) => {
    try {
        const folderId = typeof req.params.folderId === 'string' && req.params.folderId.trim()
            ? req.params.folderId.trim()
            : undefined;
        let currentFolder = null;
        if (folderId) {
            const [existingFolder] = await connection_1.db
                .select({
                id: schema_1.driveFolders.id,
                name: schema_1.driveFolders.name,
                parentFolderId: schema_1.driveFolders.parentFolderId,
                createdAt: schema_1.driveFolders.createdAt,
                updatedAt: schema_1.driveFolders.updatedAt,
            })
                .from(schema_1.driveFolders)
                .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.id, folderId));
            if (!existingFolder) {
                throw new Errors_1.NotFound('Folder not found');
            }
            currentFolder = existingFolder;
        }
        const folders = await connection_1.db
            .select({
            id: schema_1.driveFolders.id,
            name: schema_1.driveFolders.name,
            parentFolderId: schema_1.driveFolders.parentFolderId,
            createdAt: schema_1.driveFolders.createdAt,
            updatedAt: schema_1.driveFolders.updatedAt,
        })
            .from(schema_1.driveFolders)
            .where(folderId ? (0, drizzle_orm_1.eq)(schema_1.driveFolders.parentFolderId, folderId) : (0, drizzle_orm_1.isNull)(schema_1.driveFolders.parentFolderId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.driveFolders.name), (0, drizzle_orm_1.asc)(schema_1.driveFolders.createdAt));
        const files = await connection_1.db
            .select({
            id: schema_1.driveAssets.id,
            title: schema_1.driveAssets.title,
            type: schema_1.driveAssets.type,
            status: schema_1.driveAssets.status,
            folderId: schema_1.driveAssets.folderId,
            bunnyGuid: schema_1.driveAssets.bunnyGuid,
            sourceUrl: schema_1.driveAssets.sourceUrl,
            createdAt: schema_1.driveAssets.createdAt,
            updatedAt: schema_1.driveAssets.updatedAt,
        })
            .from(schema_1.driveAssets)
            .where(folderId ? (0, drizzle_orm_1.eq)(schema_1.driveAssets.folderId, folderId) : (0, drizzle_orm_1.isNull)(schema_1.driveAssets.folderId))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.driveAssets.title), (0, drizzle_orm_1.asc)(schema_1.driveAssets.createdAt));
        return (0, response_1.SuccessResponse)(res, {
            currentFolder,
            folders,
            files,
        }, 200);
    }
    catch (error) {
        if (error instanceof Errors_1.NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('[Drive Controller] Error fetching drive contents:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.getDriveContents = getDriveContents;
const createFolder = async (req, res) => {
    try {
        const { name, parentFolderId, folderId } = req.body;
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedParentFolderId = typeof parentFolderId === 'string' && parentFolderId.trim()
            ? parentFolderId.trim()
            : typeof folderId === 'string' && folderId.trim()
                ? folderId.trim()
                : undefined;
        if (!normalizedName) {
            throw new BadRequest_1.BadRequest('Folder name is required');
        }
        if (normalizedParentFolderId) {
            const [existingParentFolder] = await connection_1.db
                .select({ id: schema_1.driveFolders.id })
                .from(schema_1.driveFolders)
                .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.id, normalizedParentFolderId));
            if (!existingParentFolder) {
                throw new Errors_1.NotFound('Parent folder not found');
            }
        }
        const duplicateFolder = await connection_1.db
            .select({ id: schema_1.driveFolders.id })
            .from(schema_1.driveFolders)
            .where(normalizedParentFolderId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.driveFolders.name, normalizedName), (0, drizzle_orm_1.eq)(schema_1.driveFolders.parentFolderId, normalizedParentFolderId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.driveFolders.name, normalizedName), (0, drizzle_orm_1.isNull)(schema_1.driveFolders.parentFolderId)));
        if (duplicateFolder.length > 0) {
            throw new BadRequest_1.BadRequest('A folder with this name already exists in the selected location');
        }
        await connection_1.db.insert(schema_1.driveFolders).values({
            name: normalizedName,
            parentFolderId: normalizedParentFolderId,
        });
        const [createdFolder] = await connection_1.db
            .select({
            id: schema_1.driveFolders.id,
            name: schema_1.driveFolders.name,
            parentFolderId: schema_1.driveFolders.parentFolderId,
            createdAt: schema_1.driveFolders.createdAt,
            updatedAt: schema_1.driveFolders.updatedAt,
        })
            .from(schema_1.driveFolders)
            .where(normalizedParentFolderId
            ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.driveFolders.name, normalizedName), (0, drizzle_orm_1.eq)(schema_1.driveFolders.parentFolderId, normalizedParentFolderId))
            : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.driveFolders.name, normalizedName), (0, drizzle_orm_1.isNull)(schema_1.driveFolders.parentFolderId)))
            .orderBy((0, drizzle_orm_1.asc)(schema_1.driveFolders.createdAt));
        return (0, response_1.SuccessResponse)(res, {
            message: 'Folder created successfully',
            folder: createdFolder,
        }, 201);
    }
    catch (error) {
        if (error instanceof BadRequest_1.BadRequest || error instanceof Errors_1.NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('[Drive Controller] Error creating folder:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.createFolder = createFolder;
// Recursive function to delete a folder and all its nested contents
const deleteFolderTree = async (folderId) => {
    const files = await connection_1.db
        .select({
        id: schema_1.driveAssets.id,
        type: schema_1.driveAssets.type,
        bunnyGuid: schema_1.driveAssets.bunnyGuid,
    })
        .from(schema_1.driveAssets)
        .where((0, drizzle_orm_1.eq)(schema_1.driveAssets.folderId, folderId));
    for (const file of files) {
        if (file.type === 'video' && file.bunnyGuid) {
            await (0, services_1.deleteBunnyVideo)(file.bunnyGuid);
        }
    }
    if (files.length > 0) {
        await connection_1.db
            .delete(schema_1.driveAssets)
            .where((0, drizzle_orm_1.eq)(schema_1.driveAssets.folderId, folderId));
    }
    const childFolders = await connection_1.db
        .select({ id: schema_1.driveFolders.id })
        .from(schema_1.driveFolders)
        .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.parentFolderId, folderId));
    let deletedFolders = 0;
    let deletedFiles = files.length;
    for (const childFolder of childFolders) {
        const result = await deleteFolderTree(childFolder.id);
        deletedFolders += result.deletedFolders;
        deletedFiles += result.deletedFiles;
    }
    await connection_1.db
        .delete(schema_1.driveFolders)
        .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.id, folderId));
    return {
        deletedFolders: deletedFolders + 1,
        deletedFiles,
    };
};
// -------------------------------------------------------------------
const deleteFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        if (!folderId || typeof folderId !== 'string' || !folderId.trim()) {
            throw new BadRequest_1.BadRequest('Folder ID is required');
        }
        const normalizedFolderId = folderId.trim();
        const [folder] = await connection_1.db
            .select({
            id: schema_1.driveFolders.id,
            name: schema_1.driveFolders.name,
            parentFolderId: schema_1.driveFolders.parentFolderId,
            createdAt: schema_1.driveFolders.createdAt,
            updatedAt: schema_1.driveFolders.updatedAt,
        })
            .from(schema_1.driveFolders)
            .where((0, drizzle_orm_1.eq)(schema_1.driveFolders.id, normalizedFolderId));
        if (!folder) {
            throw new Errors_1.NotFound('Folder not found');
        }
        const deletionSummary = await deleteFolderTree(normalizedFolderId);
        return (0, response_1.SuccessResponse)(res, {
            message: 'Folder and all nested contents deleted successfully',
            folder: {
                id: folder.id,
                name: folder.name,
                parentFolderId: folder.parentFolderId,
            },
            summary: {
                deletedFolders: deletionSummary.deletedFolders,
                deletedFiles: deletionSummary.deletedFiles,
            },
        }, 200);
    }
    catch (error) {
        if (error instanceof BadRequest_1.BadRequest || error instanceof Errors_1.NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error('[Drive Controller] Error deleting folder:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
exports.deleteFolder = deleteFolder;
const handleBunnyWebhook = async (req, res) => {
    try {
        // 1. SECURITY CHECK: Validate the secret from the query string
        const providedSecret = req.query.secret;
        const expectedSecret = process.env.BUNNY_WEBHOOK_SECRET;
        if (!providedSecret || providedSecret !== expectedSecret) {
            console.warn(`[Webhook] Unauthorized attempt blocked. IP: ${req.ip}`);
            // Pro-tip: Return 200 instead of 401 so attackers don't realize they hit a valid endpoint
            return res.status(200).send('OK');
        }
        // Bunny sends these fields in the JSON body
        const videoGuid = req.body?.VideoGuid ?? req.body?.videoGuid;
        const rawStatus = req.body?.Status ?? req.body?.status;
        const requestLibraryId = req.body?.VideoLibraryId ?? req.body?.videoLibraryId;
        if (!videoGuid || typeof videoGuid !== 'string') {
            return res.status(400).send('VideoGuid is required');
        }
        const status = Number(rawStatus);
        if (Number.isNaN(status)) {
            return res.status(400).send('Status is required');
        }
        // 2. SECONDARY SECURITY: Ensure the Library ID matches your environment
        if (!requestLibraryId || String(requestLibraryId) !== String(process.env.BUNNY_LIBRARY_ID)) {
            console.warn(`[Webhook] Invalid Library ID received: ${requestLibraryId}`);
            return res.status(400).send('Invalid VideoLibraryId');
        }
        const nextStatus = status === 3 ? 'ready' : status === 5 ? 'failed' : 'processing';
        // 3. Update the database
        await connection_1.db
            .update(schema_1.driveAssets)
            .set({ status: nextStatus })
            .where((0, drizzle_orm_1.eq)(schema_1.driveAssets.bunnyGuid, videoGuid));
        if (status === 3) {
            console.log(`[Webhook] Video ${videoGuid} successfully encoded and is ready.`);
        }
        else if (status === 5) {
            console.error(`[Webhook] Video ${videoGuid} failed to encode.`);
        }
        else {
            console.log(`[Webhook] Video ${videoGuid} updated with Bunny status ${status}.`);
        }
        // You MUST return a 200 OK fast, otherwise Bunny will keep retrying the webhook
        return res.status(200).send('Webhook received');
    }
    catch (error) {
        console.error("[Webhook Error] Failed to process Bunny webhook:", error);
        // Return 500 if your DB crashes, so Bunny knows to retry the webhook later
        return res.status(500).send('Internal Server Error');
    }
};
exports.handleBunnyWebhook = handleBunnyWebhook;
const getLessonVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!req.user?.id) {
            throw new Errors_1.UnauthorizedError('Not authenticated');
        }
        if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
            throw new BadRequest_1.BadRequest('Video ID is required');
        }
        const normalizedVideoId = videoId.trim();
        const [videoAsset] = await connection_1.db
            .select({
            id: schema_1.driveAssets.id,
            title: schema_1.driveAssets.title,
            type: schema_1.driveAssets.type,
            status: schema_1.driveAssets.status,
            bunnyGuid: schema_1.driveAssets.bunnyGuid,
        })
            .from(schema_1.driveAssets)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.driveAssets.id, normalizedVideoId), (0, drizzle_orm_1.eq)(schema_1.driveAssets.bunnyGuid, normalizedVideoId)));
        if (!videoAsset) {
            throw new Errors_1.NotFound('Video not found');
        }
        if (videoAsset.type !== 'video') {
            throw new BadRequest_1.BadRequest('Requested asset is not a video');
        }
        if (!videoAsset.bunnyGuid) {
            throw new BadRequest_1.BadRequest('Video is missing Bunny stream identifier');
        }
        if (videoAsset.status === 'failed') {
            throw new BadRequest_1.BadRequest('Video processing failed. Please re-upload the video.');
        }
        if (videoAsset.status !== 'ready') {
            throw new BadRequest_1.BadRequest('Video is not ready for streaming yet');
        }
        // 1. Verify Authorization (Database check)
        // Example: const hasAccess = await db.checkStudentLessonAccess(req.user.id, videoAsset.id);
        // if (!hasAccess) return res.status(403).json({ message: "Unauthorized" });
        // 2. Generate the expiring URL
        const streamUrl = (0, services_1.generateSecureStreamUrl)(videoAsset.bunnyGuid);
        // 3. Return it to your React frontend
        return (0, response_1.SuccessResponse)(res, {
            video: {
                id: videoAsset.id,
                title: videoAsset.title,
                streamUrl,
            },
        }, 200);
    }
    catch (error) {
        if (error instanceof BadRequest_1.BadRequest || error instanceof Errors_1.NotFound || error instanceof Errors_1.UnauthorizedError) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("[Drive Controller] Error generating stream URL:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.getLessonVideo = getLessonVideo;
const deleteVideo = async (req, res) => {
    try {
        const { videoId } = req.params;
        if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
            throw new BadRequest_1.BadRequest('Video ID is required');
        }
        const normalizedVideoId = videoId.trim();
        const [videoAsset] = await connection_1.db
            .select({
            id: schema_1.driveAssets.id,
            title: schema_1.driveAssets.title,
            type: schema_1.driveAssets.type,
            bunnyGuid: schema_1.driveAssets.bunnyGuid,
        })
            .from(schema_1.driveAssets)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.driveAssets.id, normalizedVideoId), (0, drizzle_orm_1.eq)(schema_1.driveAssets.bunnyGuid, normalizedVideoId)));
        if (!videoAsset) {
            throw new Errors_1.NotFound('Video not found');
        }
        if (videoAsset.type !== 'video') {
            throw new BadRequest_1.BadRequest('Requested asset is not a video');
        }
        // 2. Delete the actual file from Bunny.net storage to save costs
        if (videoAsset.bunnyGuid) {
            await (0, services_1.deleteBunnyVideo)(videoAsset.bunnyGuid);
        }
        // 3. Delete the record from your database
        await connection_1.db
            .delete(schema_1.driveAssets)
            .where((0, drizzle_orm_1.eq)(schema_1.driveAssets.id, videoAsset.id));
        return (0, response_1.SuccessResponse)(res, {
            message: 'Video permanently deleted from Drive and Storage',
            video: {
                id: videoAsset.id,
                title: videoAsset.title,
            },
        }, 200);
    }
    catch (error) {
        if (error instanceof BadRequest_1.BadRequest || error instanceof Errors_1.NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        console.error("[Drive Controller] Error deleting video:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
exports.deleteVideo = deleteVideo;
