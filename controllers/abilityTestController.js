const abilityTestService = require('../services/abilityTestService');
const { SUBMIT_ABILITY_SCHEMA } = require('../utils/validations')

const getUserStatus = async (req, res, next) => {
    try {
        const user_id = req.user.id;

        const data = await abilityTestService.checkUserStatus(user_id);

        return res.status(201).json({
            status: 'success',
            message: 'User Baru',
            data: data
        })
    } catch (error) {
        if (error.statusCode === 403) {
            return res.status(403).json({
                status: 'error',
                message: error.message
            });
        }

        next(error);
    }
}

const generateAbilityTest = async (req, res, next) => {
    try {
        const user_id = req.user.id;

        await abilityTestService.checkUserStatus(user_id)
        
        const data = await abilityTestService.generateQuestionsForUser(user_id);

        return res.status(201).json({
            status: 'success',
            message: '10 Soal berhasil dibangkitkan',
            data: data
        });

    } catch (error) {
        if (error.statusCode === 403) {
            return res.status(403).json({
                status: 'error',
                message: error.message
            });
        }

        next(error);
    }
}

const submitAbilityTest = async (req, res, next) => {
    try {
        const { error, value } = SUBMIT_ABILITY_SCHEMA.validate({
            ...req.body,
            user_id: req.user.id 
        });

        if (error) {
            return res.status(400).json({ 
                status: 'error', 
                message: error.details[0].message.replace(/"/g, '') 
            });
        }

        const { user_id, session_id, answers} = value;

        const evaluation = await abilityTestService.evaluateAndSaveTheta(user_id, session_id, answers);

        return res.status(200).json({
            status: 'success',
            message: 'Ability test selesai. Theta awal berhasil dikalkulasi.',
            data: evaluation
        });

    } catch (error) {

        if (error.message === 'Sesi ujian tidak valid atau tidak ditemukan.') {
            return res.status(404).json({ status: 'error', message: error.message });
        }
        next(error);
    }
};

module.exports = { generateAbilityTest, submitAbilityTest, getUserStatus }