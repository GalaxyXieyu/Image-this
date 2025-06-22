-- 初始化数据库脚本
-- 这个脚本会在 PostgreSQL 容器首次启动时执行

-- 创建数据库（如果不存在）
-- 注意：POSTGRES_DB 环境变量已经会创建数据库，这里只是确保

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建扩展（如果需要）
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 可以在这里添加其他初始化 SQL 语句
-- 比如创建初始用户、设置权限等

-- 输出初始化完成信息
SELECT 'Database initialization completed' AS status;
