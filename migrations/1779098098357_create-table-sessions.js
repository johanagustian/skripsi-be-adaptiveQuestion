/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable('sessions', {
        session_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        user_id: {
            type: 'VARCHAR(50)',
            notNull: false,
            references: 'users(user_id)',
            onDelete: 'SET NULL'
        },
        document_id: {
            type: 'VARCHAR(50)',
            notNull: false,
            references: 'documents(document_id)',
            onDelete: 'SET NULL'
        },
        created_at: {
            type: 'TIMESTAMP',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    })
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('sessions');
};
