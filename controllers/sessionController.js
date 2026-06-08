const sessionService = require('../services/sessionService');
const { 
    SESSION_SCHEMA, 
    GENERATE_QUESTION_SCHEMA, 
    LEARNING_HISTORY_SCHEMA 
} = require('../utils/validations');

const getAllSessions = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const history = await sessionService.getAllSessions(user_id);
        
        return res.status(200).json({
            status: 'success',
            data: history
        });
    } catch (error) {
        next(error);
    }
};

const startSession = async (req, res, next) => {
    try {
        const { error, value } = SESSION_SCHEMA.validate({ 
            ...req.body, 
            user_id: req.user.id 
        });

        if (error) {
            return res.status(400).json({ 
                status: 'error', 
                message: error.details[0].message.replace(/"/g, '') // Menghilangkan tanda kutip dari pesan Joi
            });
        }

        const { user_id, document_id } = value;
        const result = await sessionService.startSession(user_id, document_id);
        
        return res.status(201).json({
            status: 'success',
            message: 'Sesi ujian adaptif berhasil dimulai',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

const getNextQuestion = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { error, value } = GENERATE_QUESTION_SCHEMA.validate(req.body);

        if (error) {
            return res.status(400).json({ 
                status: 'failed', 
                message: error.details[0].message.replace(/"/g, '') 
            });
        }

        const { session_id, document_id } = value;
        const questionData = await sessionService.getNextQuestion(session_id, user_id, document_id);
        
        return res.status(200).json({
            status: 'success',
            data: questionData
        });
    } catch (error) {
        next(error);
    }
};

const submitAnswer = async (req, res, next) => {
    try {
        const { error, value } = LEARNING_HISTORY_SCHEMA.validate({ 
            ...req.body, 
            user_id: req.user.id 
        });

        if (error) {
            return res.status(400).json({ 
                status: 'error', 
                message: error.details[0].message.replace(/"/g, '') 
            });
        }

        const { session_id, user_id, question_id, user_answer } = value;
        const evaluation = await sessionService.submitAnswer(session_id, user_id, question_id, user_answer);
        
        return res.status(200).json({
            status: 'success',
            data: evaluation
        });
    } catch (error) {
        next(error);
    }
};

const getSessionSummary = async (req, res, next) => {
    try {
        const { session_id } = req.params;
        
        const summary = await sessionService.getSessionSummary(session_id);
        
        return res.status(200).json({
            status: 'success',
            data: summary
        });
    } catch (error) {
        next(error);
    }
};

const getSessionReview = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { session_id } = req.params;
        
        const reviewData = await sessionService.getSessionReview(session_id, user_id);
        
        return res.status(200).json({
            status: 'success',
            data: reviewData
        });
    } catch (error) {
        next(error);
    }
};

module.exports = { startSession, getNextQuestion, submitAnswer, getSessionSummary, getAllSessions, getSessionReview };