const { db } = require('../config/db');
class OUmodel {

    async getOUnamebyId(id) {
        try {
            const query = `SELECT dname FROM tblorganizationalunits WHERE did = $1`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }

    async createOU(OrgName, Description, parentouid, OUsettings, Location, jsSettings) {
        try {
            const query = `INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "jsSettings") VALUES ($1, $2, $3, $4, $5) RETURNING *`;
            // Pass jsSettings as an array directly to PostgreSQL
            // PostgreSQL will handle the JSON objects within the array
            const result = await db.query(query, [OrgName, Description, parentouid, new Date(), jsSettings]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }
}



module.exports = OUmodel;


// tblorganizationalunits
// [
//     {
//       "column_name": "did",
//       "data_type": "uuid",
//       "character_maximum_length": null
//     },
//     {
//       "column_name": "dname",
//       "data_type": "character varying",
//       "character_maximum_length": 100
//     },
//     {
//       "column_name": "ddescription",
//       "data_type": "text",
//       "character_maximum_length": null
//     },
//     {
//       "column_name": "dparentouid",
//       "data_type": "uuid",
//       "character_maximum_length": null
//     },
//     {
//       "column_name": "tcreatedat",
//       "data_type": "timestamp without time zone",
//       "character_maximum_length": null
//     },
//     {
//       "column_name": "jsSettings",
//       "data_type": "ARRAY",
//       "character_maximum_length": null
//     }
//   ]