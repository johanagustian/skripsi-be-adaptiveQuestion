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
    // 1. Pembuatan Tabel ability_test_sessions
    pgm.createTable('ability_test_sessions', {
        session_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        user_id: {
            type: 'VARCHAR(50)',
            notNull: true,
            references: ('users(user_id)'),
            onDelete: 'CASCADE'
        },
        created_at: {
            type: 'TIMESTAMP',
            notNull: true,
            default: pgm.func('current_timestamp')
        }
    });

    // 2. Pembuatan Tabel ability_test_items
    pgm.createTable('ability_test_items', {
        item_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        session_id: {
            type: 'VARCHAR(50)',
            notNull: true,
            references: ('ability_test_sessions(session_id)'),
            onDelete: 'CASCADE'
        },
        difficulty_level: {
            type: 'VARCHAR(20)',
            notNull: true
        },
        question_text: {
            type: 'TEXT',
            notNull: true
        },
        options: {
            type: 'JSONB',
            notNull: true
        },
        correct_answer: {
            type: 'TEXT',
            notNull: true
        }
    });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable('ability_test_items');
    pgm.dropTable('ability_test_sessions');
};
