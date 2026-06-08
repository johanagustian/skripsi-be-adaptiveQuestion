const Joi = require('joi');

const REGISTRASI_SCHEMA = Joi.object({
    full_name: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
}).unknown(true);

const LOGIN_SCHEMA = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
}).unknown(true);

const REFRESH_TOKEN_SCHEMA = Joi.object({
    refreshToken: Joi.string().required(),
}).unknown(true);

const DOCUMENT_SCHEMA = Joi.object({
    file_name: Joi.string().max(100).required()
}).unknown(true);

const SESSION_SCHEMA = Joi.object({
    user_id: Joi.string().max(50).required(),
    document_id: Joi.string().max(50).required(),
}).unknown(true);

const GENERATE_QUESTION_SCHEMA = Joi.object({
    session_id: Joi.string().max(50).required(),
    document_id: Joi.string().max(50).required(),
}).unknown(true);

const LEARNING_HISTORY_SCHEMA = Joi.object({
    session_id: Joi.string().max(50).required(),
    user_id: Joi.string().max(50).required(),
    question_id: Joi.string().max(50).required(),
    
    // VALIDASI KETAT USER ANSWER
    user_answer: Joi.string()
        .uppercase()
        .valid('A', 'B', 'C', 'D')
        .required()
        .messages({
            'any.only': 'Format jawaban tidak valid. Harus A, B, C, atau D.',
            'string.empty': 'Data jawaban tidak boleh kosong.',
            'any.required': 'Data jawaban wajib dikirim.'
        }),
}).unknown(true);

const SUBMIT_ABILITY_SCHEMA = Joi.object({
    session_id: Joi.string().max(50).required(),
    answers: Joi.array().items(
        Joi.object({
            question_id: Joi.string().required(),
            user_answer: Joi.string()
                .uppercase()
                .valid('A', 'B', 'C', 'D')
                .required()
        })
    ).min(1).required().messages({
        'array.base': 'Format answers harus berupa array.',
        'array.min': 'Minimal harus ada 1 jawaban yang dikirim.'
    })
}).unknown(true);

module.exports = {
    REGISTRASI_SCHEMA,
    LOGIN_SCHEMA,
    REFRESH_TOKEN_SCHEMA,
    DOCUMENT_SCHEMA,
    SESSION_SCHEMA,
    GENERATE_QUESTION_SCHEMA,
    LEARNING_HISTORY_SCHEMA,
    SUBMIT_ABILITY_SCHEMA,
};