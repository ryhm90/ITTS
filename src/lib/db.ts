import sql from 'mssql';

let pool: sql.ConnectionPool | null = null;

const config: sql.config = {
  user: process.env.DB_USER!, // ! للتأكيد أن القيمة ليست undefined
  password: process.env.DB_PASS!,
  server: process.env.DB_HOST!,
  database: process.env.DB_NAME!,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

export async function getConnection(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await sql.connect(config);
  }
  return pool;
}
