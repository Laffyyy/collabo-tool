const { sql } = require('../config/db');

class SecurityQuestionsModel {
  static async getAll() {
    try {
      const result = await sql`
        SELECT did, dquestiontext, tcreatedat 
        FROM tblsecurityquestions 
        ORDER BY tcreatedat ASC
      `;
      return result;
    } catch (error) {
      throw new Error(`Failed to fetch security questions: ${error.message}`);
    }
  }

  static async getById(questionId) {
    try {
      const result = await sql`
        SELECT did, dquestiontext, tcreatedat 
        FROM tblsecurityquestions 
        WHERE did = ${questionId}
      `;
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch security question: ${error.message}`);
    }
  }
}

module.exports = SecurityQuestionsModel;