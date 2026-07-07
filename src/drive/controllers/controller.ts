import { Request, Response } from 'express';
import { and, asc, eq, isNull, or, desc } from 'drizzle-orm';
import path from "path";
import fs from "fs/promises";
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound, UnauthorizedError } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { db } from '../../models/connection';
import { driveAssets, driveFolders } from '../../models/schema';
import {
    createBunnyVideoEntry,
    generateTusUploadCredentials,
    generateSecureStreamUrl,
    deleteBunnyVideo
} from '../services/services';

export const initializeVideoUpload = async (req: Request, res: Response) => {
    try {
        const { videoTitle, folderId } = req.body;

        // if (!videoTitle || typeof videoTitle !== 'string' || !videoTitle.trim()) {
        //     throw new BadRequest('Video title is required');
        // }

        if (folderId) {
            const [existingFolder] = await db.select()
                .from(driveFolders)
                .where(eq(driveFolders.id, folderId));

            if (!existingFolder) {
                throw new NotFound('Folder not found');
            }
        }

        // Auto-extract filename from TUS Upload-Metadata header if videoTitle not provided
        const tusMetadata = req.headers['upload-metadata'];
        let extractedFileName: string | undefined;
        if (tusMetadata && typeof tusMetadata === 'string') {
            const filenamePart = tusMetadata.split(',').find(part => part.trim().startsWith('filename'));
            if (filenamePart) {
                const encoded = filenamePart.trim().split(' ')[1];
                if (encoded) {
                    extractedFileName = Buffer.from(encoded, 'base64').toString('utf-8');
                }
            }
        }
        const trimmedVideoTitle = videoTitle ? videoTitle.trim() : (extractedFileName ? extractedFileName.trim() : 'Untitled Video');
        const videoId = await createBunnyVideoEntry(trimmedVideoTitle);

        // 2. Generate the secure TUS signature for the browser
        const uploadCredentials = generateTusUploadCredentials(videoId);

        // 3. Save the initial record to your database
        await db.insert(driveAssets).values({
            title: trimmedVideoTitle,
            type: 'video',
            status: 'uploading',
            folderId,
            bunnyGuid: videoId,
        });

        // 4. Return everything the frontend needs
        return SuccessResponse(res, {
            message: 'Ready for direct browser upload',
            uploadCredentials,
        }, 200);

    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error('[Drive Controller] Error initializing upload:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const uploadDriveFile = async (req: Request, res: Response) => {
    try {
        const file = req.file;
        const { folderId , title } = req.body;

        if (!file) {
            throw new BadRequest('File is required');
        }

        if (folderId) {
            const [existingFolder] = await db.select()
                .from(driveFolders)
                .where(eq(driveFolders.id, folderId));

            if (!existingFolder) {
                throw new NotFound('Folder not found');
            }
        }

        const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const rootDir = path.resolve(__dirname, "../../../");
        const uploadsDir = path.join(rootDir, "uploads", "drive");

        await fs.mkdir(uploadsDir, { recursive: true });
        await fs.writeFile(path.join(uploadsDir, fileName), file.buffer);

        const protocol = req.get("x-forwarded-proto") || req.protocol || "https";
        const sourceUrl = `${protocol}://${req.get("host")}/uploads/drive/${fileName}`;

        let type: 'image' | 'pdf' | 'document' | 'other' = 'other';
        if (ext.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
            type = 'image';
        } else if (ext === '.pdf') {
            type = 'pdf';
        } else if (ext.match(/\.(doc|docx|txt)$/)) {
            type = 'document';
        }

        await db.insert(driveAssets).values({
            title: title ? title : file.originalname,
            type: type as any,
            status: 'ready',
            folderId: folderId || null,
            sourceUrl: sourceUrl,
        });

        const [createdAsset] = await db.select()
            .from(driveAssets)
            .where(eq(driveAssets.sourceUrl, sourceUrl))
            .orderBy(desc(driveAssets.createdAt));

        return SuccessResponse(res, {
            message: 'File uploaded successfully',
            file: createdAsset,
        }, 201);
    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error('[Drive Controller] Error uploading file:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const getDriveContents = async (req: Request, res: Response) => {
    try {
        const folderId = typeof req.params.folderId === 'string' && req.params.folderId.trim()
            ? req.params.folderId.trim()
            : undefined;

        let currentFolder: {
            id: string;
            name: string;
            parentFolderId: string | null;
            createdAt: Date | null;
            updatedAt: Date | null;
        } | null = null;

        if (folderId) {
            const [existingFolder] = await db
                .select({
                    id: driveFolders.id,
                    name: driveFolders.name,
                    parentFolderId: driveFolders.parentFolderId,
                    createdAt: driveFolders.createdAt,
                    updatedAt: driveFolders.updatedAt,
                })
                .from(driveFolders)
                .where(eq(driveFolders.id, folderId));

            if (!existingFolder) {
                throw new NotFound('Folder not found');
            }

            currentFolder = existingFolder;
        }

        const folders = await db
            .select({
                id: driveFolders.id,
                name: driveFolders.name,
                parentFolderId: driveFolders.parentFolderId,
                createdAt: driveFolders.createdAt,
                updatedAt: driveFolders.updatedAt,
            })
            .from(driveFolders)
            .where(folderId ? eq(driveFolders.parentFolderId, folderId) : isNull(driveFolders.parentFolderId))
            .orderBy(asc(driveFolders.name), asc(driveFolders.createdAt));

        const files = await db
            .select({
                id: driveAssets.id,
                title: driveAssets.title,
                type: driveAssets.type,
                status: driveAssets.status,
                folderId: driveAssets.folderId,
                bunnyGuid: driveAssets.bunnyGuid,
                sourceUrl: driveAssets.sourceUrl,
                createdAt: driveAssets.createdAt,
                updatedAt: driveAssets.updatedAt,
            })
            .from(driveAssets)
            .where(folderId ? eq(driveAssets.folderId, folderId) : isNull(driveAssets.folderId))
            .orderBy(asc(driveAssets.title), asc(driveAssets.createdAt));

        return SuccessResponse(res, {
            currentFolder,
            folders,
            files,
        }, 200);
    } catch (error) {
        if (error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error('[Drive Controller] Error fetching drive contents:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const createFolder = async (req: Request, res: Response) => {
    try {
        const { name, parentFolderId, folderId } = req.body;
        const normalizedName = typeof name === 'string' ? name.trim() : '';
        const normalizedParentFolderId = typeof parentFolderId === 'string' && parentFolderId.trim()
            ? parentFolderId.trim()
            : typeof folderId === 'string' && folderId.trim()
                ? folderId.trim()
                : undefined;

        if (!normalizedName) {
            throw new BadRequest('Folder name is required');
        }

        if (normalizedParentFolderId) {
            const [existingParentFolder] = await db
                .select({ id: driveFolders.id })
                .from(driveFolders)
                .where(eq(driveFolders.id, normalizedParentFolderId));

            if (!existingParentFolder) {
                throw new NotFound('Parent folder not found');
            }
        }

        const duplicateFolder = await db
            .select({ id: driveFolders.id })
            .from(driveFolders)
            .where(
                normalizedParentFolderId
                    ? and(
                        eq(driveFolders.name, normalizedName),
                        eq(driveFolders.parentFolderId, normalizedParentFolderId),
                    )
                    : and(
                        eq(driveFolders.name, normalizedName),
                        isNull(driveFolders.parentFolderId),
                    ),
            );

        if (duplicateFolder.length > 0) {
            throw new BadRequest('A folder with this name already exists in the selected location');
        }

        await db.insert(driveFolders).values({
            name: normalizedName,
            parentFolderId: normalizedParentFolderId,
        });

        const [createdFolder] = await db
            .select({
                id: driveFolders.id,
                name: driveFolders.name,
                parentFolderId: driveFolders.parentFolderId,
                createdAt: driveFolders.createdAt,
                updatedAt: driveFolders.updatedAt,
            })
            .from(driveFolders)
            .where(
                normalizedParentFolderId
                    ? and(
                        eq(driveFolders.name, normalizedName),
                        eq(driveFolders.parentFolderId, normalizedParentFolderId),
                    )
                    : and(
                        eq(driveFolders.name, normalizedName),
                        isNull(driveFolders.parentFolderId),
                    ),
            )
            .orderBy(asc(driveFolders.createdAt));

        return SuccessResponse(res, {
            message: 'Folder created successfully',
            folder: createdFolder,
        }, 201);
    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error('[Drive Controller] Error creating folder:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
// Recursive function to delete a folder and all its nested contents
const deleteFolderTree = async (folderId: string): Promise<{ deletedFolders: number; deletedFiles: number; }> => {
    const files = await db
        .select({
            id: driveAssets.id,
            type: driveAssets.type,
            bunnyGuid: driveAssets.bunnyGuid,
            sourceUrl: driveAssets.sourceUrl,
        })
        .from(driveAssets)
        .where(eq(driveAssets.folderId, folderId));

    for (const file of files) {
        if (file.type === 'video' && file.bunnyGuid) {
            await deleteBunnyVideo(file.bunnyGuid);
        } else if (file.sourceUrl) {
            try {
                const relativePath = "uploads/" + file.sourceUrl.split("/uploads/")[1];
                const rootDir = path.resolve(__dirname, "../../../");
                const filePath = path.join(rootDir, relativePath);
                await fs.unlink(filePath);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    console.error("Failed to delete local file:", err);
                }
            }
        }
    }

    if (files.length > 0) {
        await db
            .delete(driveAssets)
            .where(eq(driveAssets.folderId, folderId));
    }

    const childFolders = await db
        .select({ id: driveFolders.id })
        .from(driveFolders)
        .where(eq(driveFolders.parentFolderId, folderId));

    let deletedFolders = 0;
    let deletedFiles = files.length;

    for (const childFolder of childFolders) {
        const result = await deleteFolderTree(childFolder.id);
        deletedFolders += result.deletedFolders;
        deletedFiles += result.deletedFiles;
    }

    await db
        .delete(driveFolders)
        .where(eq(driveFolders.id, folderId));

    return {
        deletedFolders: deletedFolders + 1,
        deletedFiles,
    };
};
// -------------------------------------------------------------------
export const deleteFolder = async (req: Request, res: Response) => {
    try {
        const { folderId } = req.params;

        if (!folderId || typeof folderId !== 'string' || !folderId.trim()) {
            throw new BadRequest('Folder ID is required');
        }

        const normalizedFolderId = folderId.trim();
        const [folder] = await db
            .select({
                id: driveFolders.id,
                name: driveFolders.name,
                parentFolderId: driveFolders.parentFolderId,
                createdAt: driveFolders.createdAt,
                updatedAt: driveFolders.updatedAt,
            })
            .from(driveFolders)
            .where(eq(driveFolders.id, normalizedFolderId));

        if (!folder) {
            throw new NotFound('Folder not found');
        }

        const deletionSummary = await deleteFolderTree(normalizedFolderId);

        return SuccessResponse(res, {
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
    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error('[Drive Controller] Error deleting folder:', error);
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

export const handleBunnyWebhook = async (req: Request, res: Response) => {
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

        const nextStatus: 'uploading' | 'processing' | 'ready' | 'failed' =
            status === 3 ? 'ready' : status === 5 ? 'failed' : 'processing';

        // 3. Update the database
        await db
            .update(driveAssets)
            .set({ status: nextStatus })
            .where(eq(driveAssets.bunnyGuid, videoGuid));

        if (status === 3) {
            console.log(`[Webhook] Video ${videoGuid} successfully encoded and is ready.`);
        } else if (status === 5) {
            console.error(`[Webhook] Video ${videoGuid} failed to encode.`);
        } else {
            console.log(`[Webhook] Video ${videoGuid} updated with Bunny status ${status}.`);
        }

        // You MUST return a 200 OK fast, otherwise Bunny will keep retrying the webhook
        return res.status(200).send('Webhook received');

    } catch (error) {
        console.error("[Webhook Error] Failed to process Bunny webhook:", error);
        // Return 500 if your DB crashes, so Bunny knows to retry the webhook later
        return res.status(500).send('Internal Server Error');
    }
};

export const getLessonVideo = async (req: Request, res: Response) => {
    try {
        const { videoId } = req.params;

        if (!req.user?.id) {
            throw new UnauthorizedError('Not authenticated');
        }

        if (!videoId || typeof videoId !== 'string' || !videoId.trim()) {
            throw new BadRequest('Video ID is required');
        }

        const normalizedVideoId = videoId.trim();
        const [videoAsset] = await db
            .select({
                id: driveAssets.id,
                title: driveAssets.title,
                type: driveAssets.type,
                status: driveAssets.status,
                bunnyGuid: driveAssets.bunnyGuid,
            })
            .from(driveAssets)
            .where(
                or(
                    eq(driveAssets.id, normalizedVideoId),
                    eq(driveAssets.bunnyGuid, normalizedVideoId),
                ),
            );

        if (!videoAsset) {
            throw new NotFound('Video not found');
        }

        if (videoAsset.type !== 'video') {
            throw new BadRequest('Requested asset is not a video');
        }

        if (!videoAsset.bunnyGuid) {
            throw new BadRequest('Video is missing Bunny stream identifier');
        }

        if (videoAsset.status === 'failed') {
            throw new BadRequest('Video processing failed. Please re-upload the video.');
        }

        if (videoAsset.status !== 'ready') {
            throw new BadRequest('Video is not ready for streaming yet');
        }

        // 1. Verify Authorization (Database check)
        // Example: const hasAccess = await db.checkStudentLessonAccess(req.user.id, videoAsset.id);
        // if (!hasAccess) return res.status(403).json({ message: "Unauthorized" });

        // 2. Generate the expiring URL
        const streamUrl = generateSecureStreamUrl(videoAsset.bunnyGuid);

        // 3. Return it to your React frontend
        return SuccessResponse(res, {
            video: {
                id: videoAsset.id,
                title: videoAsset.title,
                streamUrl,
            },
        }, 200);

    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound || error instanceof UnauthorizedError) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error("[Drive Controller] Error generating stream URL:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const deleteDriveFile = async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;

        if (!fileId || typeof fileId !== 'string' || !fileId.trim()) {
            throw new BadRequest('File ID is required');
        }

        const normalizedFileId = fileId.trim();
        const [asset] = await db
            .select({
                id: driveAssets.id,
                title: driveAssets.title,
                type: driveAssets.type,
                bunnyGuid: driveAssets.bunnyGuid,
                sourceUrl: driveAssets.sourceUrl,
            })
            .from(driveAssets)
            .where(
                or(
                    eq(driveAssets.id, normalizedFileId),
                    eq(driveAssets.bunnyGuid, normalizedFileId),
                ),
            );

        if (!asset) {
            throw new NotFound('File not found');
        }

        if (asset.type === 'video' && asset.bunnyGuid) {
            await deleteBunnyVideo(asset.bunnyGuid);
        } else if (asset.sourceUrl) {
            try {
                const relativePath = "uploads/" + asset.sourceUrl.split("/uploads/")[1];
                const rootDir = path.resolve(__dirname, "../../../");
                const filePath = path.join(rootDir, relativePath);
                await fs.unlink(filePath);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    console.error("Failed to delete local file:", err);
                }
            }
        }

        await db
            .delete(driveAssets)
            .where(eq(driveAssets.id, asset.id));

        return SuccessResponse(res, {
            message: 'File permanently deleted from Drive and Storage',
            file: {
                id: asset.id,
                title: asset.title,
            },
        }, 200);

    } catch (error) {
        if (error instanceof BadRequest || error instanceof NotFound) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }

        console.error("[Drive Controller] Error deleting file:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};