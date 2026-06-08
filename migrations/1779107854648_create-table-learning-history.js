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
    pgm.createTable('learning_history', {
        history_id: {
            type: 'VARCHAR(50)',
            primaryKey: true
        },
        session_id: {
            type: 'VARCHAR(50)',
            notNull: false,
            references: ('sessions(session_id)'),
            onDelete: 'SET NULL'
        },
        user_id: {
            type: 'VARCHAR(50)',
            notNull: false,
            references: ('users(user_id)'),
            onDelete: 'SET NULL'
        },
        question_id: {
            type: 'VARCHAR(50)',
            notNull: false,
            references: ('generate_questions(question_id)'),
            onDelete: 'SET NULL'
        },
        user_answer: {
            type: 'TEXT',
            notNull: true,
        },
        is_correct: {
            type: 'BOOLEAN',
            notNull: true,
        },
        theta_before: {
            type: 'FLOAT',
            notNull: true,
        },
        theta_after: {
            type: 'FLOAT',
            notNull: true,
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
    pgm.dropTable('learning_history')
};
