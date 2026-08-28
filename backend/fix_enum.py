import django, os
os.environ['DJANGO_SETTINGS_MODULE'] = 'retailos.settings'
django.setup()

from django.db import connection

with connection.cursor() as cur:
    cur.execute("ALTER TABLE transactions ALTER COLUMN type TYPE VARCHAR(20)")
    print("Fixed transactions.type column!")

    # Also fix credit_ledger.status if it has the same issue
    try:
        cur.execute("ALTER TABLE credit_ledger ALTER COLUMN status TYPE VARCHAR(10)")
        print("Fixed credit_ledger.status column!")
    except Exception as e:
        print(f"credit_ledger.status already OK or skipped: {e}")
