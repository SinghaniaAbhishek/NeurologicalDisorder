import sqlite3
import os

db_path = r"c:\Users\abhishek\Desktop\eeg_project\files\neuroscan.db"
out_path = r"c:\Users\abhishek\Desktop\eeg_project\files\db_results.txt"

with open(out_path, "w") as f:
    f.write(f"Checking: {db_path}\n")
    if not os.path.exists(db_path):
        f.write("Database doesn't exist.\n")
    else:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [t[0] for t in cur.fetchall()]
        f.write(f"Tables found: {tables}\n")
        
        for table_name in tables:
            cur.execute(f"PRAGMA table_info({table_name})")
            columns = [c[1] for c in cur.fetchall()]
            f.write(f"Table '{table_name}' columns: {columns}\n")
            
        conn.close()
    f.write("Done.")
print("Results written to db_results.txt")
