#!/bin/sh
set -eu

echo "== C2C bootstrap: create DBs, apply schema, seed data =="

DATABASES="${POSTGRES_MULTIPLE_DATABASES:-auth_db,product_db,order_db,admin_mod_db,chat_db}"

create_db_if_missing() {
    db="$1"
    exists="$(psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${db}'")"

    if [ "$exists" != "1" ]; then
        echo "[db] creating ${db}"
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres -c "CREATE DATABASE \"${db}\""
    else
        echo "[db] exists ${db}"
    fi

    psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d postgres \
        -c "GRANT ALL PRIVILEGES ON DATABASE \"${db}\" TO \"${POSTGRES_USER}\";"
}

apply_migrations() {
    db="$1"
    client_dir="$2"
    migrations_root="/docker-entrypoint-initdb.d/prisma-clients/${client_dir}/migrations"

    if [ ! -d "$migrations_root" ]; then
        echo "[migrate] skip ${db} (missing ${migrations_root})"
        return
    fi

    echo "[migrate] ${db}"
    find "$migrations_root" -type f -name migration.sql | sort | while IFS= read -r sql_file; do
        echo "  -> $(basename "$(dirname "$sql_file")")"
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db" -f "$sql_file"
    done
}

apply_seed() {
    db="$1"
    seed_file="/docker-entrypoint-initdb.d/seeds/${db}.sql"

    if [ -f "$seed_file" ]; then
        echo "[seed] ${db}"
        psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db" -f "$seed_file"
    else
        echo "[seed] skip ${db} (no seed file)"
    fi
}

# Support comma-separated values in POSTGRES_MULTIPLE_DATABASES.
for db in $(echo "$DATABASES" | tr ',' ' '); do
    create_db_if_missing "$db"
done

apply_migrations "auth_db" "auth-client"
apply_migrations "product_db" "product-client"
apply_migrations "order_db" "order-client"
apply_migrations "chat_db" "chat-client"
apply_migrations "admin_mod_db" "admin-mod-client"

for db in $(echo "$DATABASES" | tr ',' ' '); do
    apply_seed "$db"
done

echo "== C2C bootstrap complete =="