const { db } = require('../config/db');
class OUmodel {
    constructor(id, name, description, parentouid, createdat, OUsettings) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.parentouid = parentouid;
        this.createdat = createdat;
        this.OUsettings = OUsettings;
    }

    async getOUnamebyId(id) {
        try {
            const query = `SELECT dname FROM tblorganizationalunits WHERE did = $1`;
            const result = await db.query(query, [id]);
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