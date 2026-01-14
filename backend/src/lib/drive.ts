import { google } from "googleapis";

const projectId = process.env.GOOGLE_PROJECT_ID ?? "";
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL ?? "";
const privateKey = process.env.GOOGLE_PRIVATE_KEY ?? "";
const rootFolderId = process.env.DRIVE_ROOT_FOLDER_ID ?? "";

if (!projectId || !clientEmail || !privateKey || !rootFolderId) {
  throw new Error("Missing Google Drive env vars.");
}

const normalizedKey = privateKey.replace(/\\n/g, "\n");

export const driveRootFolderId = rootFolderId;

export const getDriveClient = () => {
  const auth = new google.auth.JWT({
    email: clientEmail,
    key: normalizedKey,
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });

  return google.drive({ version: "v3", auth });
};
