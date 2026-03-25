import asyncio
import asyncpg
import os
from dotenv import load_dotenv

# Path to the .env file in the current directory
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

async def run_migration():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL not found in environment.")
        return

    # Stripping '+asyncpg' prefix for asyncpg connection
    clean_url = database_url.replace('+asyncpg', '')
    
    try:
        conn = await asyncpg.connect(clean_url)
        print("Migrating: Checking 'is_finalized' in 'sessions' table...")
        
        # Check if table exists first
        table_exists = await conn.fetchval("""
            SELECT count(*) 
            FROM information_schema.tables 
            WHERE table_name='sessions'
        """)
        
        if table_exists == 0:
            print("Table 'sessions' not found. Skipping column migration (it will be created by the app).")
            return

        # 2. Check and migrate AnswerLog (posture_score)
        ans_column_exists = await conn.fetchval("""
            SELECT count(*) 
            FROM information_schema.columns 
            WHERE table_name='answers' AND column_name='posture_score'
        """)
        
        if ans_column_exists == 0:
            await conn.execute("ALTER TABLE answers ADD COLUMN posture_score FLOAT DEFAULT 0.0;")
            print("Successfully added 'posture_score' column.")
        else:
            print("Column 'posture_score' already exists.")
            
    except Exception as e:
        print(f"Migration Error: {e}")
    finally:
        if 'conn' in locals():
            await conn.close()

if __name__ == "__main__":
    asyncio.run(run_migration())
