#!/bin/bash
cd /Users/pramodsinghmanyal/Desktop/E-LearningWebApp/backend

echo "========================================" | tee migrate_output.log
echo "Running Library Migrations" | tee -a migrate_output.log
echo "========================================" | tee -a migrate_output.log
echo "" | tee -a migrate_output.log

echo "Step 1: Checking current migrations..." | tee -a migrate_output.log
python3 manage.py showmigrations library 2>&1 | tee -a migrate_output.log
echo "" | tee -a migrate_output.log

echo "Step 2: Running migrations on tenant_pramod database..." | tee -a migrate_output.log
python3 manage.py migrate library --database=tenant_pramod -v 2 2>&1 | tee -a migrate_output.log
echo "" | tee -a migrate_output.log

echo "Step 3: Verifying tables in database..." | tee -a migrate_output.log
sqlite3 config/school_pramod.sqlite3 "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'library%';" 2>&1 | tee -a migrate_output.log
echo "" | tee -a migrate_output.log

echo "========================================" | tee -a migrate_output.log
echo "Migration Complete! Check migrate_output.log for details" | tee -a migrate_output.log
echo "========================================" | tee -a migrate_output.log

cat migrate_output.log
