import { config } from 'dotenv';
config();

export const PROVIDE = process.env.PROVIDE;
export const TYPE = 'postgres';
export const HOST = process.env.HOST;
export const PORT = Number(process.env.PORT);
export const USERNAME = process.env.USERNAME;
export const PASSWORD = process.env.PASSWORD;
export const DATABASE = process.env.DATABASE;


