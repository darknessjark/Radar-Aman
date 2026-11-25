// Kept for the old schedule; does the full daily job.
import { GET as dailyGET } from "../daily/route";
export const runtime = "nodejs";
export const maxDuration = 300;
export const GET = req => dailyGET(req);
