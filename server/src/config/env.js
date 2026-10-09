"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
for (const candidate of [
    node_path_1.default.resolve(process.cwd(), '.env'),
    node_path_1.default.resolve(process.cwd(), '..', '.env'),
    node_path_1.default.resolve(__dirname, '../../.env')
]) {
    dotenv_1.default.config({ path: candidate });
}
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4001),
    SERVER_PORT: zod_1.z.coerce.number().int().positive().default(4001),
    DATABASE_URL: zod_1.z.string().min(1).optional(),
    JWT_SECRET: zod_1.z.string().min(32).default('dev_jwt_secret_for_local_testing_only_1234567890'),
    CORS_ORIGIN: zod_1.z.string().default('http://localhost:3007'),
    SUPABASE_URL: zod_1.z.string().url().optional().or(zod_1.z.literal('')),
    SUPABASE_ANON_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional().or(zod_1.z.literal('')),
    SUPABASE_JWT_SECRET: zod_1.z.string().optional().or(zod_1.z.literal(''))
});
exports.config = envSchema.parse(process.env);
