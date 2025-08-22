const sql = require('../config/db');

exports.createConversation = async ({ dname, dtype, dcreatedBy }) => {
  const [conversation] = await sql`
    INSERT INTO "tblconversations" (dname, dtype, dcreatedBy, tcreatedAt)
    VALUES (${dname}, ${dtype}, ${dcreatedBy}, NOW())
    RETURNING *
  `;
  return conversation;
};

exports.addMessage = async ({ dconversationId, dsenderId, dcontent, dmessageType }) => {
  const [message] = await sql`
    INSERT INTO "tblmessages" (dconversationId, dsenderId, dcontent, dmessageType, tcreatedAt)
    VALUES (${dconversationId}, ${dsenderId}, ${dcontent}, ${dmessageType || 'text'}, NOW())
    RETURNING *
  `;
  return message;
};

exports.getMessagesByConversation = async (conversationId) => {
  return await sql`
    SELECT m.*, u.dusername
    FROM "tblmessages" m
    JOIN "tblusers" u ON m.dsenderId = u.did
    WHERE m.dconversationId = ${conversationId}
    ORDER BY m.tcreatedAt ASC
  `;
};