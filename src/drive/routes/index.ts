import { Router } from 'express';
import { login } from '../controllers/auth';
import { 
  createFolder,
  deleteFolder,
  deleteDriveFile,
  getDriveContents,
  handleBunnyWebhook, 
  initializeVideoUpload,
  uploadDriveFile,
  getLessonVideo
} from '../controllers/controller';
import { authenticated } from '../../middlewares/authenticated';
import { authorizeRoles } from '../../middlewares/authorized';
import { requireDriveSuperAdmin } from '../middlewares/superAdmin';
import multer from 'multer';

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for general files
});

const router = Router();

router.post('/auth/login', login);

// ==========================================
// ADMIN ROUTES (Video Upload & Management)
// ==========================================

// 1. Initialize the secure direct upload to Bunny.net
router.post('/upload/init', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, initializeVideoUpload);

// 1.5. Standard file and image upload to the local Drive
router.post('/upload/file', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, upload.single('file'), uploadDriveFile);

// [Placeholder] 2. Standard Drive CRUD operations for the Admin
// An admin needs to be able to fetch the virtual folders and delete mistakes.
router.get('/folders', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, getDriveContents);
router.get('/folders/:folderId', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, getDriveContents);
router.post('/folders', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, createFolder);
router.delete('/folders/:folderId', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, deleteFolder);
router.delete('/files/:fileId', authenticated, authorizeRoles('admin', 'driver'), requireDriveSuperAdmin, deleteDriveFile);


// ==========================================
// STUDENT/USER ROUTES (Video Playback)
// ==========================================

// 3. Get the secure, expiring HLS streaming URL for the custom React player
// Notice we allow both 'student' and 'admin' here so admins can preview the video.
router.get(
  '/stream/:videoId', 
  authenticated, 
  authorizeRoles('student', 'admin'), 
  getLessonVideo
);


// ==========================================
// PUBLIC WEBHOOK ROUTES (System integrations)
// ==========================================

// 4. The PUBLIC Webhook route for Bunny.net
// Do NOT add 'authenticated' here. Bunny.net handles its own security via the query secret.
router.post('/webhook/bunny', handleBunnyWebhook);

export default router;