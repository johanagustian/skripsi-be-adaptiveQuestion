const axios = require("axios");
const pool = require("../db");
const crypto = require('crypto');

const ABILITY_TEST_CONTEXT = require("../utils/abilityTestContext");

const AI_SERVICE_URL = "http://localhost:8000/generate";

const checkUserStatus = async (user_id) => {
  const existingSession = await pool.query(
    "SELECT session_id FROM ability_test_sessions WHERE user_id = $1 LIMIT 1",
    [user_id],
  );

  if (existingSession.rows.length > 0) {
    const error = new Error(
      "Akses ditolak. Anda sudah pernah mengambil Ability Test sebelumnya.",
    );

    error.statusCode = 403;
    throw error;
  }

  return 'New user'
};

const getContextParts = () => {
  // Anda perlu menyesuaikan regex ini sesuai format string di abilityTestContext.js
  const parts = ABILITY_TEST_CONTEXT.split(/Context \d+/).filter(p => p.trim() !== "");
  return parts;
};

const generateQuestionsForUser = async (user_id) => {
  const client = await pool.connect();
  const contextParts = getContextParts();

  try {
    await client.query("BEGIN");

    const session_id = `sess-ab-test-${crypto.randomUUID()}`;
    await client.query("INSERT INTO ability_test_sessions (session_id, user_id) VALUES ($1, $2)", [session_id, user_id]);

    const generatedQuestions = [];
    const difficulties = ["middle", "high"];

    for (let i = 0; i < contextParts.length; i++) {
      const currentContext = contextParts[i].trim();

      for (const diff of difficulties) {
        const response = await axios.post(AI_SERVICE_URL, {
          difficulty: diff,
          context: currentContext,
          mode_kreatif: true,
        });

        const questionData = response.data;
        const itemId = `itm-${crypto.randomUUID()}`;

        await client.query(
          `INSERT INTO ability_test_items (item_id, session_id, difficulty_level, question_text, options, correct_answer, reading_context) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [itemId, session_id, diff, questionData.question_text, JSON.stringify(questionData.options), questionData.correct_answer, currentContext]
        );

        generatedQuestions.push({
          item_id: itemId,
          difficulty: diff,
          question_text: questionData.question_text,
          options: questionData.options,
          reading_context: currentContext
        });
      }
    }

    await client.query("COMMIT");
    return { session_id, questions: generatedQuestions };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const evaluateAndSaveTheta = async (user_id, session_id, answers) => {
  const dbItems = await pool.query(
    "SELECT item_id, options, correct_answer, reading_context FROM ability_test_items WHERE session_id = $1",
    [session_id],
  );

  if (dbItems.rows.length === 0) {
    throw new Error("Sesi ujian tidak valid atau tidak ditemukan.");
  }

  const total_soal = 10;
  let jumlah_benar = 0;

  const letterToIndex = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

  answers.forEach((userAns) => {
    const dbAnswer = dbItems.rows.find((question) => question.item_id === userAns.question_id);

    if (dbAnswer) {
      const optionsArray = typeof dbAnswer.options === 'string' ? JSON.parse(dbAnswer.options) : dbAnswer.options;

      const userIndex = letterToIndex[userAns.user_answer.toUpperCase()];
      const selectedText = optionsArray[userIndex];

      if ( selectedText && selectedText.trim().toLowerCase() === dbAnswer.correct_answer.trim().toLowerCase()) {
        jumlah_benar++;
      }
    }

  });

  // panggil fungsi cold start
  const theta_awal = await coldStart(jumlah_benar, total_soal);

  const ability_id = `ability-id-${crypto.randomUUID()}`;

  // 4. Simpan Theta dengan UPSERT (ON CONFLICT) yang benar (EXCLUDED.theta_score)
  await pool.query(
    `INSERT INTO user_abilities (ability_id, user_id, theta_score) VALUES ($1, $2, $3) 
     ON CONFLICT (user_id) 
     DO UPDATE SET 
        theta_score = EXCLUDED.theta_score,
        last_updated = CURRENT_TIMESTAMP`,
    [ability_id, user_id, parseFloat(theta_awal)]
  );
  
  return { jumlah_benar, total_soal, theta_awal };
};

const coldStart = async(jumlah_benar, total_soal) => {
  let p = jumlah_benar / total_soal;
  if (p === 0) p = 0.05;
  if (p === 1) p = 0.95;

  // persamaan logit odds
  let theta_awal = Math.log(p / (1 - p));
  theta_awal = Math.round(theta_awal * 1000) / 1000;
  
  return theta_awal;
}


module.exports = { generateQuestionsForUser, evaluateAndSaveTheta, checkUserStatus };
