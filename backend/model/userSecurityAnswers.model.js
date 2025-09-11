const { sql } = require('../config/db');
const bcrypt = require('bcryptjs');

class UserSecurityAnswersModel {
  static async saveUserAnswers(userId, questionAnswers) {
    try {
      // First, delete any existing answers for this user
      await sql`
        DELETE FROM tblusersecurityanswers 
        WHERE duserid = ${userId}
      `;

      // Insert new answers one by one
      for (const qa of questionAnswers) {
        const answerHash = await bcrypt.hash(qa.answer.toLowerCase().trim(), 10);
        
        await sql`
          INSERT INTO tblusersecurityanswers (duserid, dsecurityquestionid, danswerhash)
          VALUES (${userId}, ${qa.questionId}, ${answerHash})
        `;
      }

      return { success: true, message: 'Security answers saved successfully' };
    } catch (error) {
      console.error('Error saving security answers:', error);
      throw new Error(`Failed to save security answers: ${error.message}`);
    }
  }

  static async getUserSecurityQuestions(userId) {
    try {
      const result = await sql`
        SELECT 
          usa.did,
          usa.dsecurityquestionid,
          sq.dquestiontext,
          usa.tcreatedat
        FROM tblusersecurityanswers usa
        INNER JOIN tblsecurityquestions sq ON usa.dsecurityquestionid = sq.did
        WHERE usa.duserid = ${userId}
        ORDER BY usa.tcreatedat ASC
      `;
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch user security questions: ${error.message}`);
    }
  }

  static async verifySecurityAnswer(userId, questionId, providedAnswer) {
    try {
      const result = await sql`
        SELECT danswerhash
        FROM tblusersecurityanswers
        WHERE duserid = ${userId} AND dsecurityquestionid = ${questionId}
      `;

      if (!result[0]) {
        return false;
      }

      const isValid = await bcrypt.compare(
        providedAnswer.toLowerCase().trim(), 
        result[0].danswerhash
      );
      
      return isValid;
    } catch (error) {
      throw new Error(`Failed to verify security answer: ${error.message}`);
    }
  }

  static async verifyAllSecurityAnswers(userId, questionAnswers) {
    try {
      let allCorrect = true;
      
      for (const qa of questionAnswers) {
        const isCorrect = await this.verifySecurityAnswer(userId, qa.questionId, qa.answer);
        if (!isCorrect) {
          allCorrect = false;
          break;
        }
      }
      
      return allCorrect;
    } catch (error) {
      throw new Error(`Failed to verify security answers: ${error.message}`);
    }
  }

  static async hasSecurityAnswers(userId) {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM tblusersecurityanswers
        WHERE duserid = ${userId}
      `;
      return parseInt(result[0].count) > 0;
    } catch (error) {
      throw new Error(`Failed to check user security answers: ${error.message}`);
    }
  }
}

module.exports = UserSecurityAnswersModel;