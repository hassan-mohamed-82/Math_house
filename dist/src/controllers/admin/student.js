"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.increaseLessonsDuration = exports.purchasePackageForStudent = exports.getStudentPackages = exports.attendItems = exports.getStudentContent = exports.getPaymentHistory = exports.topUpWallet = exports.openStudentAccount = exports.selection = exports.getStudentsByGrade = exports.getStudentsByCategory = exports.deleteStudent = exports.updateStudent = exports.getStudentById = exports.getAllStudents = exports.createStudent = void 0;
const connection_1 = require("../../models/connection");
const schema_1 = require("../../models/schema");
const drizzle_orm_1 = require("drizzle-orm");
const response_1 = require("../../utils/response");
const NotFound_1 = require("../../Errors/NotFound");
const BadRequest_1 = require("../../Errors/BadRequest");
const bcrypt_1 = __importDefault(require("bcrypt"));
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const handleImages_1 = require("../../utils/handleImages");
const JWT_SECRET = process.env.JWT_SECRET;
const createStudent = async (req, res) => {
    const { firstname, lastname, nickname, email, password, phone, category: categoryId, grade, parentphone, avatar, } = req.body;
    if (!firstname || !lastname || !nickname || !email || !password || !phone || !categoryId || !grade) {
        throw new BadRequest_1.BadRequest("all fields are required");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
    if (existingStudent.length > 0) {
        throw new BadRequest_1.BadRequest("email already exists");
    }
    const existingCategory = await connection_1.db
        .select()
        .from(schema_1.category)
        .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
    if (existingCategory.length === 0) {
        throw new BadRequest_1.BadRequest("category not found");
    }
    if (existingCategory[0].parentCategoryId) {
        throw new BadRequest_1.BadRequest("student must be assigned to a main category only");
    }
    const [existingGrade] = await connection_1.db
        .select()
        .from(schema_1.grade)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.grade.id, grade), (0, drizzle_orm_1.eq)(schema_1.grade.parentCategoryId, categoryId)));
    if (!existingGrade) {
        throw new BadRequest_1.BadRequest("grade not found or does not belong to the selected category");
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const id = (0, uuid_1.v4)();
    const imgUrl = avatar ? await (0, handleImages_1.validateAndSaveLogo)(req, avatar, "students") : null;
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.Student).values({
            id,
            firstname,
            lastname,
            nickname,
            email,
            password: hashedPassword,
            phone,
            category: categoryId,
            grade,
            parentphone,
            isVerified: true,
            avatar: imgUrl
        });
        await tx.insert(schema_1.wallet).values({
            studentId: id,
            balance: 0
        });
    });
    (0, response_1.SuccessResponse)(res, { message: "create student success", data: { id } });
};
exports.createStudent = createStudent;
const getAllStudents = async (req, res) => {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    let query = connection_1.db
        .select({
        id: schema_1.Student.id,
        avatar: schema_1.Student.avatar,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: {
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        },
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.Student.grade, schema_1.grade.id));
    // Search
    if (search) {
        const searchTerm = `%${search}%`;
        query = query.where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.Student.firstname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.lastname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.nickname, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.email, searchTerm), (0, drizzle_orm_1.like)(schema_1.Student.phone, searchTerm)));
    }
    const students = await query.limit(Number(limit)).offset(offset);
    // Format response like the image
    const formattedStudents = students.map(s => ({
        id: s.id,
        name: `${s.firstname} ${s.lastname} (${s.nickname})`,
        firstname: s.firstname,
        lastname: s.lastname,
        nickname: s.nickname,
        email: s.email,
        phone: s.phone,
        parentPhone: s.parentphone,
        category: s.category,
        categoryName: s.categoryName,
        grade: s.grade,
        avatar: s.avatar,
        paymentStatus: "Free" // هتحتاج تعدلها حسب الـ Logic بتاعك
    }));
    (0, response_1.SuccessResponse)(res, { message: "get all students success", data: formattedStudents });
};
exports.getAllStudents = getAllStudents;
const getStudentById = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        avatar: schema_1.Student.avatar,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        categoryName: schema_1.category.name,
        grade: {
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        },
        parentphone: schema_1.Student.parentphone,
        wallet: {
            walletId: schema_1.wallet.id,
            balance: schema_1.wallet.balance,
        },
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.Student.category, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.Student.grade, schema_1.grade.id))
        .leftJoin(schema_1.wallet, (0, drizzle_orm_1.eq)(schema_1.Student.id, schema_1.wallet.studentId))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
    }
    const studentCourses = await connection_1.db
        .select({
        id: schema_1.courses.id,
        name: schema_1.courses.name,
        image: schema_1.courses.image,
    })
        .from(schema_1.enrolledItems)
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.enrolledItems.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, id))
        .groupBy(schema_1.courses.id);
    const studentPackages = await connection_1.db
        .select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        type: schema_1.packages.type,
        price: schema_1.packages.price,
    })
        .from(schema_1.payment)
        .innerJoin(schema_1.packages, (0, drizzle_orm_1.eq)(schema_1.payment.packageId, schema_1.packages.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payment.studentId, id), (0, drizzle_orm_1.eq)(schema_1.payment.status, "completed")))
        .groupBy(schema_1.packages.id);
    // Fetch all exam attempts for the student
    const studentExamAttempts = await connection_1.db
        .select()
        .from(schema_1.examAttempts)
        .where((0, drizzle_orm_1.eq)(schema_1.examAttempts.studentId, id));
    const attemptExamIds = studentExamAttempts.map(a => a.examId);
    // Fetch all exams in student's category OR exams that the student has attempted
    const examWhereConditions = [
        (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, student.category)
    ];
    if (attemptExamIds.length > 0) {
        examWhereConditions.push((0, drizzle_orm_1.inArray)(schema_1.Exams.id, attemptExamIds));
    }
    const allExams = await connection_1.db
        .select({
        id: schema_1.Exams.id,
        title: schema_1.Exams.title,
        description: schema_1.Exams.description,
        totalScore: schema_1.Exams.totalScore,
        passScore: schema_1.Exams.passScore,
        isActive: schema_1.Exams.isActive,
    })
        .from(schema_1.Exams)
        .innerJoin(schema_1.courses, (0, drizzle_orm_1.eq)(schema_1.Exams.courseId, schema_1.courses.id))
        .where((0, drizzle_orm_1.or)(...examWhereConditions));
    const studentExams = allExams.map(exam => {
        const attempt = studentExamAttempts.find(a => a.examId === exam.id);
        let status = "absent";
        let score = null;
        let attemptId = null;
        let date = null;
        if (attempt) {
            if (attempt.status === "completed" || attempt.status === "timed_out") {
                status = "attend";
                score = attempt.score;
                attemptId = attempt.id;
                date = attempt.endedAt;
            }
            else if (attempt.status === "in_progress") {
                status = "waiting";
                attemptId = attempt.id;
            }
        }
        return {
            examId: exam.id,
            examName: exam.title,
            description: exam.description,
            totalScore: exam.totalScore,
            passScore: exam.passScore,
            isActive: exam.isActive,
            status,
            attemptId,
            score,
            date,
        };
    });
    const fullStudentData = {
        ...student,
        courses: studentCourses,
        packages: studentPackages,
        exams: studentExams,
    };
    (0, response_1.SuccessResponse)(res, { message: "get student success", data: fullStudentData });
};
exports.getStudentById = getStudentById;
const updateStudent = async (req, res) => {
    const { id } = req.params;
    const { firstname, lastname, nickname, email, phone, category: categoryId, grade, parentphone, password, avatar } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const existingStudent = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (existingStudent.length === 0) {
        throw new NotFound_1.NotFound("student not found");
    }
    if (email && email !== existingStudent[0].email) {
        const emailExists = await connection_1.db
            .select()
            .from(schema_1.Student)
            .where((0, drizzle_orm_1.eq)(schema_1.Student.email, email));
        if (emailExists.length > 0) {
            throw new BadRequest_1.BadRequest("email already exists");
        }
    }
    if (categoryId) {
        const existingCategory = await connection_1.db
            .select({ id: schema_1.category.id, parentCategoryId: schema_1.category.parentCategoryId })
            .from(schema_1.category)
            .where((0, drizzle_orm_1.eq)(schema_1.category.id, categoryId));
        if (existingCategory.length === 0) {
            throw new BadRequest_1.BadRequest("category not found");
        }
        if (existingCategory[0].parentCategoryId) {
            throw new BadRequest_1.BadRequest("student must be assigned to a main category only");
        }
    }
    if (grade) {
        const catId = categoryId || existingStudent[0].category;
        const [existingGrade] = await connection_1.db
            .select()
            .from(schema_1.grade)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.grade.id, grade), (0, drizzle_orm_1.eq)(schema_1.grade.parentCategoryId, catId)));
        if (!existingGrade) {
            throw new BadRequest_1.BadRequest("grade not found or does not belong to the selected category");
        }
    }
    let ImgUrl;
    if (avatar) {
        ImgUrl = await (0, handleImages_1.handleImageUpdate)(req, existingStudent[0].avatar, avatar, "students");
    }
    const updateData = {};
    if (firstname)
        updateData.firstname = firstname;
    if (lastname)
        updateData.lastname = lastname;
    if (nickname)
        updateData.nickname = nickname;
    if (email)
        updateData.email = email;
    if (phone)
        updateData.phone = phone;
    if (categoryId)
        updateData.category = categoryId;
    if (avatar)
        updateData.avatar = ImgUrl;
    if (grade)
        updateData.grade = grade;
    if (parentphone)
        updateData.parentphone = parentphone;
    if (password) {
        updateData.password = await bcrypt_1.default.hash(password, 10);
    }
    if (Object.keys(updateData).length === 0) {
        throw new BadRequest_1.BadRequest("no data to update");
    }
    await connection_1.db
        .update(schema_1.Student)
        .set(updateData)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "update student success", data: updateData });
};
exports.updateStudent = updateStudent;
const deleteStudent = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("id is required");
    }
    const student = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (student.length === 0) {
        throw new NotFound_1.NotFound("student not found");
    }
    if (student[0].avatar) {
        await (0, handleImages_1.deleteImage)(student[0].avatar);
    }
    await connection_1.db.delete(schema_1.wallet).where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, id));
    await connection_1.db.delete(schema_1.Student).where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, { message: "delete student success" });
};
exports.deleteStudent = deleteStudent;
const getStudentsByCategory = async (req, res) => {
    const { categoryId } = req.params;
    if (!categoryId) {
        throw new BadRequest_1.BadRequest("category id is required");
    }
    const students = await connection_1.db
        .select({
        id: schema_1.Student.id,
        avatar: schema_1.Student.avatar,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        grade: {
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        },
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.Student.grade, schema_1.grade.id))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.category, categoryId));
    (0, response_1.SuccessResponse)(res, { message: "get students by category success", data: students });
};
exports.getStudentsByCategory = getStudentsByCategory;
const getStudentsByGrade = async (req, res) => {
    const { grade } = req.params;
    if (!grade) {
        throw new BadRequest_1.BadRequest("grade is required");
    }
    const students = await connection_1.db
        .select({
        id: schema_1.Student.id,
        avatar: schema_1.Student.avatar,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        nickname: schema_1.Student.nickname,
        email: schema_1.Student.email,
        phone: schema_1.Student.phone,
        category: schema_1.Student.category,
        grade: {
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        },
        parentphone: schema_1.Student.parentphone
    })
        .from(schema_1.Student)
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.Student.grade, schema_1.grade.id))
        .where((0, drizzle_orm_1.eq)(schema_1.Student.grade, grade));
    (0, response_1.SuccessResponse)(res, { message: "get students by grade success", data: students });
};
exports.getStudentsByGrade = getStudentsByGrade;
const selection = async (req, res) => {
    const { categoryId } = req.query;
    const categories = await connection_1.db
        .select({
        id: schema_1.category.id,
        name: schema_1.category.name,
        description: schema_1.category.description,
        image: schema_1.category.image,
    })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.isNull)(schema_1.category.parentCategoryId));
    let grades = [];
    if (categoryId) {
        grades = await connection_1.db
            .select({
            id: schema_1.grade.id,
            name: schema_1.grade.name,
            nameAr: schema_1.grade.nameAr,
        })
            .from(schema_1.grade)
            .where((0, drizzle_orm_1.eq)(schema_1.grade.parentCategoryId, String(categoryId)));
    }
    (0, response_1.SuccessResponse)(res, { message: "get all categories and grades success", data: { categories, grades } });
};
exports.selection = selection;
// ===================== NEW APIs =====================
// 🔥 Open Account (Impersonation) - الدخول كـ Student
const openStudentAccount = async (req, res) => {
    const { id } = req.params;
    const adminId = req.user?.id;
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        email: schema_1.Student.email,
        nickname: schema_1.Student.nickname,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
    }
    // إنشاء Token للـ Student
    const impersonationToken = jsonwebtoken_1.default.sign({
        id: student.id,
        email: student.email,
        name: `${student.firstname} ${student.lastname}`,
        nickname: student.nickname,
        role: "student",
        isImpersonation: true,
        impersonatedBy: adminId,
    }, JWT_SECRET, { expiresIn: "2h" });
    (0, response_1.SuccessResponse)(res, {
        message: "Account opened successfully",
        data: {
            token: impersonationToken,
            redirectUrl: `/student/dashboard`,
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
                email: student.email
            }
        }
    });
};
exports.openStudentAccount = openStudentAccount;
// 🔥 Top Up Wallet - شحن المحفظة
const topUpWallet = async (req, res) => {
    const { id } = req.params;
    const { amount, operation } = req.body;
    const adminId = req.user?.id;
    // Validate amount
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
        throw new BadRequest_1.BadRequest("Amount must be a positive number");
    }
    // Validate operation
    if (!operation || !['deposit', 'withdrawal'].includes(operation)) {
        throw new BadRequest_1.BadRequest("Operation must be 'deposit' or 'withdrawal'");
    }
    const numericAmount = Number(amount);
    // Check student exists
    const [student] = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    // Find or create wallet for this student
    let [studentWallet] = await connection_1.db
        .select()
        .from(schema_1.wallet)
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, id));
    if (!studentWallet) {
        const newWalletId = (0, uuid_1.v4)();
        await connection_1.db.insert(schema_1.wallet).values({
            id: newWalletId,
            studentId: id,
            balance: 0,
        });
        [studentWallet] = await connection_1.db
            .select()
            .from(schema_1.wallet)
            .where((0, drizzle_orm_1.eq)(schema_1.wallet.studentId, id));
    }
    // For withdrawal, ensure sufficient balance
    if (operation === 'withdrawal' && studentWallet.balance < numericAmount) {
        throw new BadRequest_1.BadRequest(`Insufficient balance. Current balance: ${studentWallet.balance}, requested withdrawal: ${numericAmount}`);
    }
    // Update wallet balance
    const newBalance = operation === 'deposit'
        ? studentWallet.balance + numericAmount
        : studentWallet.balance - numericAmount;
    await connection_1.db
        .update(schema_1.wallet)
        .set({ balance: newBalance })
        .where((0, drizzle_orm_1.eq)(schema_1.wallet.id, studentWallet.id));
    // Record the transaction
    await connection_1.db.insert(schema_1.walletTransaction).values({
        id: (0, uuid_1.v4)(),
        walletId: studentWallet.id,
        amount: numericAmount,
        type: operation,
        source: 'Admin',
    });
    (0, response_1.SuccessResponse)(res, {
        message: operation === 'deposit'
            ? `Wallet topped up successfully`
            : `Wallet deducted successfully`,
        data: {
            studentId: id,
            operation,
            amount: numericAmount,
            previousBalance: studentWallet.balance,
            newBalance,
        }
    });
};
exports.topUpWallet = topUpWallet;
// 🔥 Payment History - سجل المدفوعات
const getPaymentHistory = async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const [student] = await connection_1.db
        .select()
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("student not found");
    }
    // لو عندك جدول transactions
    /*
    const transactions = await db
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.studentId, id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(Number(limit))
        .offset((Number(page) - 1) * Number(limit));
    */
    // مؤقتاً نرجع array فاضي
    const transactions = [];
    (0, response_1.SuccessResponse)(res, {
        message: "Payment history retrieved successfully",
        data: {
            studentId: id,
            studentName: `${student.firstname} ${student.lastname}`,
            transactions: transactions
        }
    });
};
exports.getPaymentHistory = getPaymentHistory;
// ===================== CONTENT & ENROLLMENT APIs =====================
const getStudentContent = async (req, res) => {
    const { id } = req.params; // studentId
    // 1. جلب بيانات الطالب والـ CategoryId الخاص به لفلترة المحتوى
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        categoryId: schema_1.Student.category,
        gradeId: schema_1.Student.grade
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    if (!student.categoryId || !student.gradeId) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Student has no category assigned",
            data: { student, content: [] }
        });
    }
    // 2. إيجاد الفئات الفرعية التابعة للفئة الرئيسية للطالب
    const childCategories = await connection_1.db
        .select({ id: schema_1.category.id })
        .from(schema_1.category)
        .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.eq)(schema_1.category.id, student.categoryId), (0, drizzle_orm_1.eq)(schema_1.category.parentCategoryId, student.categoryId)));
    if (childCategories.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Student has no category assigned",
            data: { student, content: [] }
        });
    }
    const childCategoryIds = childCategories.map((c) => c.id);
    // 3. جلب الكورسات التابعة لهذه الفئات وتتطابق مع السنة الدراسية (grade) للطالب
    const filteredCourses = await connection_1.db
        .select({
        id: schema_1.courses.id,
        name: schema_1.courses.name,
        description: schema_1.courses.description,
        image: schema_1.courses.image,
        isHaveSemester: schema_1.courses.isHaveSemester,
        categoryId: schema_1.courses.categoryId,
        categoryName: schema_1.category.name,
    })
        .from(schema_1.courses)
        .leftJoin(schema_1.category, (0, drizzle_orm_1.eq)(schema_1.courses.categoryId, schema_1.category.id))
        .leftJoin(schema_1.grade, (0, drizzle_orm_1.eq)(schema_1.grade.categoryId, schema_1.category.id))
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.inArray)(schema_1.courses.categoryId, childCategoryIds), (0, drizzle_orm_1.eq)(schema_1.grade.id, student.gradeId)));
    if (filteredCourses.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No courses found for this student's category",
            data: { student, content: [] }
        });
    }
    const courseIds = filteredCourses.map(c => c.id);
    // 4. جلب الشباتر التابعة لهذه الكورسات
    const filteredChapters = await connection_1.db
        .select({
        id: schema_1.chapters.id,
        name: schema_1.chapters.name,
        description: schema_1.chapters.description,
        image: schema_1.chapters.image,
        courseId: schema_1.chapters.courseId,
        order: schema_1.chapters.order,
    })
        .from(schema_1.chapters)
        .where((0, drizzle_orm_1.inArray)(schema_1.chapters.courseId, courseIds));
    // 5. جلب الدروس التابعة لهذه الكورسات
    const filteredLessons = await connection_1.db
        .select({
        id: schema_1.lessons.id,
        name: schema_1.lessons.name,
        description: schema_1.lessons.description,
        image: schema_1.lessons.image,
        courseId: schema_1.lessons.courseId,
        chapterId: schema_1.lessons.chapterId,
        order: schema_1.lessons.order,
    })
        .from(schema_1.lessons)
        .where((0, drizzle_orm_1.inArray)(schema_1.lessons.courseId, courseIds));
    // 6. جلب اشتراكات الطالب الحالية (فقط الـ active أو pending لضمان الصلاحية)
    const existingEnrollments = await connection_1.db
        .select({
        courseId: schema_1.enrolledItems.courseId,
        chapterId: schema_1.enrolledItems.chapterId,
        lessonId: schema_1.enrolledItems.lessonId,
    })
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, id), (0, drizzle_orm_1.eq)(schema_1.enrolledItems.status, "active")));
    const enrolledCourseIds = new Set(existingEnrollments.filter(e => e.courseId && !e.chapterId && !e.lessonId).map(e => e.courseId));
    const enrolledChapterIds = new Set(existingEnrollments.filter(e => e.chapterId && !e.lessonId).map(e => e.chapterId));
    const enrolledLessonIds = new Set(existingEnrollments.map(e => e.lessonId).filter(Boolean));
    // 7. 🚀 بناء هيكل الشجرة الذكي (الوراثي للتأكد من الشراء)
    const contentTree = filteredCourses.map(course => {
        const isCourseEnrolled = enrolledCourseIds.has(course.id);
        return {
            ...course,
            isEnrolled: isCourseEnrolled,
            chapters: filteredChapters
                .filter(ch => ch.courseId === course.id)
                .sort((a, b) => a.order - b.order)
                .map(chapter => {
                // الشابتر متاح لو الكورس نفسه مشترى OR الشابتر مشترى يدوياً
                const isChapterEnrolled = isCourseEnrolled || enrolledChapterIds.has(chapter.id);
                return {
                    ...chapter,
                    isEnrolled: isChapterEnrolled,
                    lessons: filteredLessons
                        .filter(ls => ls.chapterId === chapter.id)
                        .sort((a, b) => a.order - b.order)
                        .map(lesson => {
                        // الدرس متاح لو الكورس مشترى OR الشابتر مشترى OR الدرس مشترى يدوياً
                        const isLessonEnrolled = isChapterEnrolled || enrolledLessonIds.has(lesson.id);
                        return {
                            ...lesson,
                            isEnrolled: isLessonEnrolled,
                        };
                    })
                };
            })
        };
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Student content filtered successfully",
        data: {
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
            },
            content: contentTree,
        }
    });
};
exports.getStudentContent = getStudentContent;
const attendItems = async (req, res) => {
    const { id } = req.params; // studentId
    const { courses: courseItems = [], chapters: chapterItems = [], lessons: lessonItems = [] } = req.body;
    // 1. التحقق من أن هناك على الأقل عنصر واحد للإشتراك
    if (courseItems.length === 0 && chapterItems.length === 0 && lessonItems.length === 0) {
        throw new BadRequest_1.BadRequest("At least one item (course, chapter, or lesson) must be provided");
    }
    // 2. التحقق من وجود الطالب في قاعدة البيانات
    const [student] = await connection_1.db
        .select({ id: schema_1.Student.id, firstname: schema_1.Student.firstname, lastname: schema_1.Student.lastname })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    // 3. جلب كل الاشتراكات الحالية للطالب (منع التكرار والـ Over-Enrollment)
    const existingEnrollments = await connection_1.db
        .select()
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, id));
    const hasCourse = (cId) => existingEnrollments.some(e => e.courseId === cId && !e.chapterId && !e.lessonId);
    const hasChapter = (chId) => existingEnrollments.some(e => e.chapterId === chId && !e.lessonId);
    const hasLesson = (lId) => existingEnrollments.some(e => e.lessonId === lId);
    // 🚀 جلب خطط الأسعار لحساب تاريخ الصلاحية (expiresAt)
    const explicitPriceIds = [
        ...courseItems.map((i) => i.priceId),
        ...chapterItems.map((i) => i.priceId),
        ...lessonItems.map((i) => i.priceId),
    ].filter(Boolean);
    const courseIdsWithNullPrice = courseItems.filter((i) => !i.priceId).map((i) => i.id);
    const chapterIdsWithNullPrice = chapterItems.filter((i) => !i.priceId).map((i) => i.id);
    const lessonIdsWithNullPrice = lessonItems.filter((i) => !i.priceId).map((i) => i.id);
    const pricePlans = [];
    if (explicitPriceIds.length > 0) {
        const found = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.inArray)(schema_1.prices.id, explicitPriceIds));
        pricePlans.push(...found);
    }
    if (courseIdsWithNullPrice.length > 0) {
        const found = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetType, "course"), (0, drizzle_orm_1.eq)(schema_1.prices.isDefault, true), (0, drizzle_orm_1.inArray)(schema_1.prices.targetId, courseIdsWithNullPrice)));
        pricePlans.push(...found);
    }
    if (chapterIdsWithNullPrice.length > 0) {
        const found = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetType, "chapter"), (0, drizzle_orm_1.eq)(schema_1.prices.isDefault, true), (0, drizzle_orm_1.inArray)(schema_1.prices.targetId, chapterIdsWithNullPrice)));
        pricePlans.push(...found);
    }
    if (lessonIdsWithNullPrice.length > 0) {
        const found = await connection_1.db.select().from(schema_1.prices).where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.prices.targetType, "lesson"), (0, drizzle_orm_1.eq)(schema_1.prices.isDefault, true), (0, drizzle_orm_1.inArray)(schema_1.prices.targetId, lessonIdsWithNullPrice)));
        pricePlans.push(...found);
    }
    // دالة مساعدة لحساب الصلاحية والـ priceId
    const getEnrollmentMeta = (itemId, itemType, explicitPriceId) => {
        let plan = null;
        if (explicitPriceId) {
            plan = pricePlans.find(p => p.id === explicitPriceId);
        }
        else {
            plan = pricePlans.find(p => p.targetId === itemId && p.targetType === itemType && p.isDefault === true);
        }
        if (plan) {
            const days = Math.floor(Number(plan.durationDays) || 0);
            const d = new Date();
            d.setDate(d.getDate() + days);
            return {
                priceId: plan.id,
                expiresAt: d,
            };
        }
        return {
            priceId: null,
            expiresAt: null,
        };
    };
    const enrollmentValues = [];
    // 4. معالجة الكورسات (Courses)
    if (courseItems.length > 0) {
        const foundCourses = await connection_1.db.select({ id: schema_1.courses.id }).from(schema_1.courses)
            .where((0, drizzle_orm_1.inArray)(schema_1.courses.id, courseItems.map((i) => i.id)));
        if (foundCourses.length !== courseItems.length) {
            throw new BadRequest_1.BadRequest("One or more course IDs are invalid");
        }
        for (const item of courseItems) {
            if (hasCourse(item.id))
                continue; // تخطي لو مشترك بالفعل في الكورس
            const meta = getEnrollmentMeta(item.id, "course", item.priceId);
            enrollmentValues.push({
                id: (0, uuid_1.v4)(),
                studentId: id,
                courseId: item.id,
                chapterId: null,
                lessonId: null,
                priceId: meta.priceId,
                expiresAt: meta.expiresAt,
                status: "active"
            });
        }
    }
    // 5. معالجة الشباتر (Chapters)
    if (chapterItems.length > 0) {
        const foundChapters = await connection_1.db.select({ id: schema_1.chapters.id, courseId: schema_1.chapters.courseId }).from(schema_1.chapters)
            .where((0, drizzle_orm_1.inArray)(schema_1.chapters.id, chapterItems.map((i) => i.id)));
        if (foundChapters.length !== chapterItems.length) {
            throw new BadRequest_1.BadRequest("One or more chapter IDs are invalid");
        }
        for (const item of chapterItems) {
            const chData = foundChapters.find(c => c.id === item.id);
            if (!chData)
                continue;
            // الحماية: لو الطالب مشترك في الكورس الأب بالكامل أو في الشابتر نفسه ⬅️ تخطي
            if (hasCourse(chData.courseId) || hasChapter(item.id))
                continue;
            const meta = getEnrollmentMeta(item.id, "chapter", item.priceId);
            enrollmentValues.push({
                id: (0, uuid_1.v4)(),
                studentId: id,
                courseId: null, // يترك null لتمييز أنه اشتراك شابتر مستقل
                chapterId: item.id,
                lessonId: null,
                priceId: meta.priceId,
                expiresAt: meta.expiresAt,
                status: "active"
            });
        }
    }
    // 6. معالجة الدروس (Lessons)
    if (lessonItems.length > 0) {
        const foundLessons = await connection_1.db.select({ id: schema_1.lessons.id, chapterId: schema_1.lessons.chapterId, courseId: schema_1.lessons.courseId }).from(schema_1.lessons)
            .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonItems.map((i) => i.id)));
        if (foundLessons.length !== lessonItems.length) {
            throw new BadRequest_1.BadRequest("One or more lesson IDs are invalid");
        }
        for (const item of lessonItems) {
            const lsData = foundLessons.find(l => l.id === item.id);
            if (!lsData)
                continue;
            // الحماية: لو مشترك في الكورس الأب أو الشابتر الأب أو الدرس نفسه ⬅️ تخطي
            if (hasCourse(lsData.courseId) || hasChapter(lsData.chapterId) || hasLesson(item.id))
                continue;
            const meta = getEnrollmentMeta(item.id, "lesson", item.priceId);
            enrollmentValues.push({
                id: (0, uuid_1.v4)(),
                studentId: id,
                courseId: null,
                chapterId: null,
                lessonId: item.id,
                priceId: meta.priceId,
                expiresAt: meta.expiresAt,
                status: "active"
            });
        }
    }
    // 7. تنفيذ عملية الحفظ في الداتابيز
    if (enrollmentValues.length === 0) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No new items to enroll (All selected items are already inherited or enrolled)",
            data: { enrolled: 0 }
        });
    }
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.enrolledItems).values(enrollmentValues);
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Student enrolled successfully",
        data: {
            student: { id: student.id, name: `${student.firstname} ${student.lastname}` },
            enrolledCount: enrollmentValues.length,
        }
    });
};
exports.attendItems = attendItems;
// ===================== ADMIN STUDENT PACKAGES APIs =====================
const getStudentPackages = async (req, res) => {
    const { id } = req.params; // studentId
    // 1. جلب بيانات الطالب، والـ CategoryId، والـ Balances الحالية
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        categoryId: schema_1.Student.category, // الفلترة على أساس السنة الدراسية للطالب
        livebalance: schema_1.Student.livebalance,
        exambalance: schema_1.Student.exambalance,
        questionbalance: schema_1.Student.questionbalance,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    // 2. 🚀 جلب طرق الدفع اليدوية/المفعلة للأدمن (مثل الكاش، فودافون كاش، يدوي... إلخ)
    // ملحوظة: إذا كان الحقل في الداتابيز عندك اسمه type قومي بالفلترة عليه، هنا بحثت بالاسم والـ isActive كأمان
    const activeManualMethods = await connection_1.db
        .select({
        id: schema_1.paymentMethod.id,
        name: schema_1.paymentMethod.name,
        // type: paymentMethod.type // يمكنك تفعيله لو الحقل متوفر في الموديل عندك
    })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethod.isActive, true), (0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(schema_1.paymentMethod.name, "%Cash%"), (0, drizzle_orm_1.like)(schema_1.paymentMethod.name, "%Manual%"), (0, drizzle_orm_1.like)(schema_1.paymentMethod.name, "%Admin%"))));
    // حماية: إذا لم يكن الطالب مسجلاً في أي كاتيغوري، نرجع باقات فارغة مع طرق الدفع فوراً
    if (!student.categoryId) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Student has no category assigned",
            data: {
                student: {
                    id: student.id,
                    name: `${student.firstname} ${student.lastname}`,
                    balances: { live: student.livebalance, exam: student.exambalance, question: student.questionbalance }
                },
                manualPaymentMethods: activeManualMethods, // إرسال الطرق حتى لو مفيش باقات
                packages: []
            }
        });
    }
    // 3. جلب الباقات المخصصة للسنة الدراسية (Category) الخاصة بهذا الطالب فقط
    const filteredPackages = await connection_1.db
        .select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        type: schema_1.packages.type,
        categoryId: schema_1.packages.categoryId,
        courseId: schema_1.packages.courseId,
        number: schema_1.packages.number,
        price: schema_1.packages.price,
        duration: schema_1.packages.duration,
    })
        .from(schema_1.packages)
        .where((0, drizzle_orm_1.eq)(schema_1.packages.categoryId, student.categoryId));
    // 4. جلب المشتريات التاريخية للباقات لهذا الطالب تحديداً
    const purchases = await connection_1.db
        .select({
        id: schema_1.payment.id,
        packageId: schema_1.payment.packageId,
        amount: schema_1.payment.amount,
        status: schema_1.payment.status,
        createdAt: schema_1.payment.createdAt,
    })
        .from(schema_1.payment)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.payment.studentId, id), (0, drizzle_orm_1.eq)(schema_1.payment.purpose, "purchase"), (0, drizzle_orm_1.isNotNull)(schema_1.payment.packageId)));
    // 5. دمج المشتريات والـ Counters داخل الباقات المفلترة
    const packagesWithPurchases = filteredPackages.map(pkg => {
        const pkgPurchases = purchases.filter(p => p.packageId === pkg.id);
        return {
            ...pkg,
            purchaseCount: pkgPurchases.length,
            purchases: pkgPurchases,
            isPurchasedBefore: pkgPurchases.some(p => p.status === "completed"),
        };
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Student packages, balances, and manual payment methods retrieved successfully",
        data: {
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
                balances: {
                    live: student.livebalance,
                    exam: student.exambalance,
                    question: student.questionbalance,
                }
            },
            manualPaymentMethods: activeManualMethods, // 🚀 مصفوفة طرق الدفع اليدوية الجاهزة للـ Dropdown
            packages: packagesWithPurchases,
        }
    });
};
exports.getStudentPackages = getStudentPackages;
const purchasePackageForStudent = async (req, res) => {
    const { id } = req.params;
    const { packageId, paymentMethodId } = req.body;
    if (!packageId) {
        throw new BadRequest_1.BadRequest("packageId is required");
    }
    if (!paymentMethodId) {
        throw new BadRequest_1.BadRequest("paymentMethodId is required");
    }
    const [student] = await connection_1.db
        .select({
        id: schema_1.Student.id,
        firstname: schema_1.Student.firstname,
        lastname: schema_1.Student.lastname,
        parentphone: schema_1.Student.parentphone,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    const [pkg] = await connection_1.db
        .select({
        id: schema_1.packages.id,
        name: schema_1.packages.name,
        type: schema_1.packages.type,
        price: schema_1.packages.price,
        number: schema_1.packages.number,
    })
        .from(schema_1.packages)
        .where((0, drizzle_orm_1.eq)(schema_1.packages.id, packageId));
    if (!pkg) {
        throw new NotFound_1.NotFound("Package not found");
    }
    const [method] = await connection_1.db
        .select({ id: schema_1.paymentMethod.id })
        .from(schema_1.paymentMethod)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.paymentMethod.id, paymentMethodId), (0, drizzle_orm_1.eq)(schema_1.paymentMethod.isActive, true)));
    if (!method) {
        throw new NotFound_1.NotFound("The selected payment method is invalid or inactive");
    }
    let parentId = null;
    if (student.parentphone) {
        const [parent] = await connection_1.db
            .select({ id: schema_1.parents.id })
            .from(schema_1.parents)
            .where((0, drizzle_orm_1.eq)(schema_1.parents.phoneNumber, student.parentphone))
            .limit(1);
        if (parent) {
            parentId = parent.id;
        }
    }
    const paymentId = (0, uuid_1.v4)();
    await connection_1.db.transaction(async (tx) => {
        await tx.insert(schema_1.payment).values({
            id: paymentId,
            studentId: id,
            parentId,
            purpose: "purchase",
            paymentMethodId: paymentMethodId,
            amount: Number(pkg.price),
            source: "student",
            packageId: pkg.id,
            status: "completed",
            reason: "Purchased and activated by Admin directly",
        });
        const amountToAdd = pkg.number;
        switch (pkg.type) {
            case "live":
                await tx.update(schema_1.Student)
                    .set({ livebalance: (0, drizzle_orm_1.sql) `${schema_1.Student.livebalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
                break;
            case "exam":
                await tx.update(schema_1.Student)
                    .set({ exambalance: (0, drizzle_orm_1.sql) `${schema_1.Student.exambalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
                break;
            case "question":
                await tx.update(schema_1.Student)
                    .set({ questionbalance: (0, drizzle_orm_1.sql) `${schema_1.Student.questionbalance} + ${amountToAdd}` })
                    .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
                break;
            default:
                throw new BadRequest_1.BadRequest("Invalid package type structure detected");
        }
    });
    const [updatedStudent] = await connection_1.db
        .select({
        livebalance: schema_1.Student.livebalance,
        exambalance: schema_1.Student.exambalance,
        questionbalance: schema_1.Student.questionbalance,
    })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    (0, response_1.SuccessResponse)(res, {
        message: "Package purchased and balance added successfully by Admin",
        data: {
            student: {
                id: student.id,
                name: `${student.firstname} ${student.lastname}`,
            },
            package: {
                id: pkg.id,
                name: pkg.name,
                type: pkg.type,
                addedAmount: pkg.number,
            },
            balances: {
                live: updatedStudent?.livebalance,
                exam: updatedStudent?.exambalance,
                question: updatedStudent?.questionbalance,
            }
        }
    });
};
exports.purchasePackageForStudent = purchasePackageForStudent;
// ===================== LESSON DURATION INCREASE API =====================
const increaseLessonsDuration = async (req, res) => {
    const { id } = req.params; // studentId
    const { lessonIds, days } = req.body;
    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
        throw new BadRequest_1.BadRequest("lessonIds must be a non-empty array");
    }
    if (!days || Number(days) <= 0) {
        throw new BadRequest_1.BadRequest("days must be a positive number");
    }
    // 1. Verify student exists
    const [student] = await connection_1.db
        .select({ id: schema_1.Student.id, firstname: schema_1.Student.firstname, lastname: schema_1.Student.lastname })
        .from(schema_1.Student)
        .where((0, drizzle_orm_1.eq)(schema_1.Student.id, id));
    if (!student) {
        throw new NotFound_1.NotFound("Student not found");
    }
    // 2. Verify all lesson IDs exist
    const foundLessons = await connection_1.db
        .select({ id: schema_1.lessons.id, chapterId: schema_1.lessons.chapterId, courseId: schema_1.lessons.courseId })
        .from(schema_1.lessons)
        .where((0, drizzle_orm_1.inArray)(schema_1.lessons.id, lessonIds));
    if (foundLessons.length !== lessonIds.length) {
        const foundIds = foundLessons.map(l => l.id);
        const invalidIds = lessonIds.filter((lid) => !foundIds.includes(lid));
        throw new BadRequest_1.BadRequest(`The following lesson IDs are invalid: ${invalidIds.join(", ")}`);
    }
    const daysToAdd = Number(days);
    const now = new Date();
    // 3. Fetch existing enrollments for these lessons
    const existingEnrollments = await connection_1.db
        .select()
        .from(schema_1.enrolledItems)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.enrolledItems.studentId, id), (0, drizzle_orm_1.inArray)(schema_1.enrolledItems.lessonId, lessonIds)));
    const enrollmentByLessonId = new Map(existingEnrollments.map(e => [e.lessonId, e]));
    const updatedLessons = [];
    const newlyEnrolledLessons = [];
    await connection_1.db.transaction(async (tx) => {
        for (const lesson of foundLessons) {
            const existing = enrollmentByLessonId.get(lesson.id);
            if (existing) {
                // Extend existing enrollment:
                // If still active (future expiry or no expiry), extend from current expiresAt
                // If expired, extend from now
                let baseDate;
                if (existing.expiresAt && existing.expiresAt > now) {
                    baseDate = new Date(existing.expiresAt);
                }
                else {
                    baseDate = new Date(now);
                }
                baseDate.setDate(baseDate.getDate() + daysToAdd);
                await tx
                    .update(schema_1.enrolledItems)
                    .set({ expiresAt: baseDate, status: "active" })
                    .where((0, drizzle_orm_1.eq)(schema_1.enrolledItems.id, existing.id));
                updatedLessons.push(lesson.id);
            }
            else {
                // Create new enrollment for this lesson
                const expiresAt = new Date(now);
                expiresAt.setDate(expiresAt.getDate() + daysToAdd);
                await tx.insert(schema_1.enrolledItems).values({
                    id: (0, uuid_1.v4)(),
                    studentId: id,
                    courseId: null,
                    chapterId: null,
                    lessonId: lesson.id,
                    priceId: null,
                    expiresAt,
                    status: "active",
                });
                newlyEnrolledLessons.push(lesson.id);
            }
        }
    });
    return (0, response_1.SuccessResponse)(res, {
        message: "Lesson duration increased successfully",
        data: {
            student: { id: student.id, name: `${student.firstname} ${student.lastname}` },
            daysAdded: daysToAdd,
            updatedEnrollments: updatedLessons.length,
            newEnrollments: newlyEnrolledLessons.length,
            updatedLessonIds: updatedLessons,
            newlyEnrolledLessonIds: newlyEnrolledLessons,
        }
    });
};
exports.increaseLessonsDuration = increaseLessonsDuration;
