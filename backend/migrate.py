import asyncio
from app.database import engine, Base
import app.models

async def migrate():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print('[MIGRATE_SUCCESS] All tables recreated with new IP/Device/Agent fields.')

if __name__ == '__main__':
    asyncio.run(migrate())
