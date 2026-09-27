"""
Reset Database Script:
Clears all bets, alerts, scans, and accounts from casino_guard.db
Restores the database to a completely clean slate (0 records).
"""
import sys
import asyncio
from app.database import engine
from sqlalchemy import text

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

async def reset():
    print("[RESET] Connecting to SQLite database...")
    async with engine.begin() as conn:
        await conn.execute(text("DELETE FROM alerts;"))
        await conn.execute(text("DELETE FROM bets;"))
        await conn.execute(text("DELETE FROM scans;"))
        await conn.execute(text("DELETE FROM accounts;"))
        print("[SUCCESS] All bets, alerts, scans, and accounts deleted successfully!")
        print("[OK] Database is now completely reset to 0.")

if __name__ == "__main__":
    asyncio.run(reset())
