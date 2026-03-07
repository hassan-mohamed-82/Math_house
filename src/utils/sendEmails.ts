import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { firestore } from "./firebase";
import { passwordResetTemplate } from "./emailTemplate";

const PASSWORD_RESET_COLLECTION = "password_reset_codes";
const PASSWORD_RESET_CODE_LENGTH = 6;
const PASSWORD_RESET_LIFETIME_MINUTES = 5;

type PasswordResetRecord = {
	email: string;
	codeHash: string;
	expiresAt: string;
	createdAt: string;
	used: boolean;
};

const getEmailDocumentId = (email: string) => Buffer.from(email.toLowerCase()).toString("base64url");

const generateNumericCode = (length: number = PASSWORD_RESET_CODE_LENGTH): string => {
	let code = "";

	for (let index = 0; index < length; index += 1) {
		code += Math.floor(Math.random() * 10).toString();
	}

	return code;
};

const getFromEmail = () => process.env.EMAIL_FROM || process.env.SMTP_FROM || "no-reply@mathhouse.app";

const getResendClient = () => {
	if (!process.env.RESEND_API_KEY) {
		return null;
	}

	return new Resend(process.env.RESEND_API_KEY);
};

const getSmtpTransporter = () => {
	const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

	if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
		return null;
	}

	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT),
		secure: Number(SMTP_PORT) === 465,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
		},
	});
};

const sendEmail = async ({
	to,
	subject,
	html,
}: {
	to: string;
	subject: string;
	html: string;
}) => {
	const resend = getResendClient();

	if (resend) {
		await resend.emails.send({
			from: getFromEmail(),
			to,
			subject,
			html,
		});

		return;
	}

	const transporter = getSmtpTransporter();

	if (transporter) {
		await transporter.sendMail({
			from: getFromEmail(),
			to,
			subject,
			html,
		});

		return;
	}

	throw new Error("No email provider configured. Set RESEND_API_KEY or SMTP credentials.");
};

export const savePasswordResetCode = async (email: string, code: string, expiresAt: Date) => {
	const codeHash = await bcrypt.hash(code, 10);
	const docId = getEmailDocumentId(email);

	const payload: PasswordResetRecord = {
		email: email.toLowerCase(),
		codeHash,
		expiresAt: expiresAt.toISOString(),
		createdAt: new Date().toISOString(),
		used: false,
	};

	await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).set(payload);
};

export const verifyPasswordResetCode = async (email: string, code: string) => {
	const docId = getEmailDocumentId(email);
	const snapshot = await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).get();

	if (!snapshot.exists) {
		return false;
	}

	const data = snapshot.data() as PasswordResetRecord;

	if (data.used) {
		return false;
	}

	if (new Date(data.expiresAt).getTime() < Date.now()) {
		return false;
	}

	return bcrypt.compare(code, data.codeHash);
};

export const consumePasswordResetCode = async (email: string) => {
	const docId = getEmailDocumentId(email);

	await firestore.collection(PASSWORD_RESET_COLLECTION).doc(docId).set(
		{
			used: true,
		},
		{ merge: true }
	);
};

export const sendPasswordResetEmail = async (email: string, name: string = "there") => {
	const code = generateNumericCode(PASSWORD_RESET_CODE_LENGTH);
	const expiresAt = new Date(Date.now() + PASSWORD_RESET_LIFETIME_MINUTES * 60 * 1000);

	await savePasswordResetCode(email, code, expiresAt);

	await sendEmail({
		to: email,
		subject: "Password Reset Code",
		html: passwordResetTemplate(name, code, `${PASSWORD_RESET_LIFETIME_MINUTES} minutes`),
	});

	return {
		email,
		expiresAt,
		lifetimeMinutes: PASSWORD_RESET_LIFETIME_MINUTES,
	};
};

export const PASSWORD_RESET_CODE_TTL_MINUTES = PASSWORD_RESET_LIFETIME_MINUTES;
