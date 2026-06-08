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
    pgm.createTable('documents',{
        document_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        user_id: {
            type: 'VARCHAR(50)',
            notNull: true,
            references: 'users(user_id)',
            onDelete: 'CASCADE'
        },
        file_name: {
            type: 'VARCHAR(100)',
            notNull: true
        },
        file_path: {
            type: 'TEXT',
            notNull: true
        },
        uploaded_at: {
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
    pgm.dropTable('documents')
};
