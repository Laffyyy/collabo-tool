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

    async getOUById(id) {
        try {
            const query = `SELECT * FROM tblorganizationalunits WHERE did = $1`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }

    async createOU(OrgName, Description, parentouid, OUsettings, Location, jsSettings) {
        try {
            // Normalize jsSettings to an array of plain objects
            let normalized = jsSettings;
            for (let i = 0; i < 2 && typeof normalized === 'string'; i++) {
                try { normalized = JSON.parse(normalized); } catch { break; }
            }
            if (!Array.isArray(normalized)) {
                normalized = normalized ? [normalized] : [];
            }

            const baseParams = [OrgName, Description, parentouid, new Date()];
            let query;
            let params;

            if (normalized.length === 0) {
                query = `INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "jsSettings") VALUES ($1, $2, $3, $4, ARRAY[]::jsonb[]) RETURNING *`;
                params = baseParams;
            } else {
                const placeholders = normalized.map((_, idx) => `$${baseParams.length + 1 + idx}::jsonb`).join(', ');
                query = `INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, tcreatedat, "jsSettings") VALUES ($1, $2, $3, $4, ARRAY[${placeholders}]) RETURNING *`;
                params = [...baseParams, ...normalized];
            }

            const result = await db.query(query, params);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }
    async getOUTotalPopulation(ouid) {
        try {
            // Recursive CTE to get all descendant OUs and count their populations
            const query = `
                WITH RECURSIVE ou_hierarchy AS (
                    -- Base case: start with the given OU
                    SELECT did FROM tblorganizationalunits WHERE did = $1
                    UNION ALL
                    -- Recursive case: find all child OUs
                    SELECT o.did 
                    FROM tblorganizationalunits o
                    INNER JOIN ou_hierarchy h ON o.dparentouid = h.did
                )
                SELECT COUNT(*) as total_population 
                FROM tbluserroles ur
                INNER JOIN ou_hierarchy oh ON ur.douid = oh.did
            `;
            const result = await db.query(query, [ouid]);
            return parseInt(result.rows[0].total_population);
        } catch (error) {
            throw new Error(error);
        }
    }

    async getOUs(start, limit, sort, sortby, search, searchby, searchvalue, isactive = 'true') {
        try {
            // Query to get OUs with member counts using a JOIN
            let baseQuery = `
                SELECT 
                    ou.did as ouid, 
                    ou.dname, 
                    ou.ddescription, 
                    ou.dparentouid, 
                    ou.tcreatedat, 
                    ou."jsSettings", 
                    ou."bisActive",
                    COALESCE(member_counts.membercount, 0) as membercount
                FROM tblorganizationalunits ou
                LEFT JOIN (
                    WITH RECURSIVE ou_hierarchy AS (
                        -- Base case: each OU
                        SELECT did as base_ou, did as descendant_ou FROM tblorganizationalunits
                        UNION ALL
                        -- Recursive case: find all child OUs
                        SELECT h.base_ou, o.did 
                        FROM tblorganizationalunits o
                        INNER JOIN ou_hierarchy h ON o.dparentouid = h.descendant_ou
                    )
                    SELECT 
                        base_ou,
                        COUNT(ur.duserid) as membercount
                    FROM ou_hierarchy oh
                    LEFT JOIN tbluserroles ur ON ur.douid = oh.descendant_ou
                    GROUP BY base_ou
                ) member_counts ON member_counts.base_ou = ou.did
            `;
            
            const activeStatus = isactive === 'true';
            let whereClause = ` WHERE ou."bisActive" = ${activeStatus}`;
            let orderClause = '';
            let limitClause = '';
            let params = [];
            let paramIndex = 1;

            // Add search conditions if search is enabled
            if (search && search !== 'false' && searchvalue && searchvalue.trim() !== '') {
                const searchCondition = ` AND (ou.dname ILIKE $${paramIndex} OR ou.ddescription ILIKE $${paramIndex})`;
                whereClause += searchCondition;
                params.push(`%${searchvalue}%`);
                paramIndex++;
            }

            // Add sorting
            const validSortColumns = ['dname', 'ddescription', 'tcreatedat'];
            const validSortBy = validSortColumns.includes(sortby) ? sortby : 'dname';
            const validSort = (sort && sort.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';
            orderClause = ` ORDER BY ou.${validSortBy} ${validSort}`;

            // Add pagination
            limitClause = ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, start);

            // Build final query
            const finalQuery = baseQuery + whereClause + orderClause + limitClause;

            // Execute query
            const result = await db.query(finalQuery, params);
            return result.rows;
        } catch (error) {
            throw new Error(error);
        }
    }

    async getOUsWithTotal(start, limit, sort, sortby, search, searchby, searchvalue, isactive = 'true') {
        try {
            // Build common filters
            const activeStatus = isactive === 'true';
            let whereClause = ` WHERE ou."bisActive" = ${activeStatus}`;
            let params = [];
            let paramIndex = 1;

            if (search && search !== 'false' && searchvalue && searchvalue.trim() !== '') {
                const searchCondition = ` AND (ou.dname ILIKE $${paramIndex} OR ou.ddescription ILIKE $${paramIndex})`;
                whereClause += searchCondition;
                params.push(`%${searchvalue}%`);
                paramIndex++;
            }

            // Validate sort
            const validSortColumns = ['dname', 'ddescription', 'tcreatedat'];
            const validSortBy = validSortColumns.includes(sortby) ? sortby : 'dname';
            const validSort = (sort && sort.toUpperCase() === 'DESC') ? 'DESC' : 'ASC';

            // Use window function COUNT(*) OVER() to compute total across filtered set
            const query = `
                WITH filtered AS (
                    SELECT ou.*
                    FROM tblorganizationalunits ou
                    ${whereClause}
                ),
                with_members AS (
                    SELECT 
                        ou.did as ouid,
                        ou.dname,
                        ou.ddescription,
                        ou.dparentouid,
                        ou.tcreatedat,
                        ou."jsSettings",
                        ou."bisActive",
                        COALESCE(mc.membercount, 0) as membercount
                    FROM filtered ou
                    LEFT JOIN (
                        WITH RECURSIVE ou_hierarchy AS (
                            SELECT did as base_ou, did as descendant_ou FROM tblorganizationalunits
                            UNION ALL
                            SELECT h.base_ou, o.did
                            FROM tblorganizationalunits o
                            INNER JOIN ou_hierarchy h ON o.dparentouid = h.descendant_ou
                        )
                        SELECT base_ou, COUNT(ur.duserid) as membercount
                        FROM ou_hierarchy oh
                        LEFT JOIN tbluserroles ur ON ur.douid = oh.descendant_ou
                        GROUP BY base_ou
                    ) mc ON mc.base_ou = ou.did
                )
                SELECT *, COUNT(*) OVER() AS total_count
                FROM with_members
                ORDER BY ${validSortBy} ${validSort}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            params.push(limit, start);
            const result = await db.query(query, params);
            const rows = result.rows.map(r => ({
                ouid: r.ouid,
                dname: r.dname,
                ddescription: r.ddescription,
                dparentouid: r.dparentouid,
                tcreatedat: r.tcreatedat,
                jsSettings: r.jsSettings,
                bisActive: r.bisActive,
                membercount: r.membercount
            }));
            const total = result.rows.length > 0 ? parseInt(result.rows[0].total_count) : 0;
            return { rows, total };
        } catch (error) {
            throw new Error(error);
        }
    }

    async getOUCount(search, searchby, searchvalue, isactive = 'true') {
        try {
            let countQuery = `SELECT COUNT(*) as total FROM tblorganizationalunits`;
            const activeStatus = isactive === 'true';
            let whereClause = ` WHERE "bisActive" = ${activeStatus}`;
            let params = [];
            let paramIndex = 1;

            // Add search conditions if search is enabled
            if (search && search !== 'false' && searchvalue && searchvalue.trim() !== '') {
                const searchCondition = ` AND ${searchby} ILIKE $${paramIndex}`;
                whereClause += searchCondition;
                params.push(`%${searchvalue}%`);
                paramIndex++;
            }

            const finalCountQuery = countQuery + whereClause;
            const result = await db.query(finalCountQuery, params);
            return parseInt(result.rows[0].total);
        } catch (error) {
            throw new Error(error);
        }
    }
    async updateOU(id, changes) {
        try {
            // Build dynamic query based on provided changes
            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (changes.OrgName !== undefined) {
                updates.push(`dname = $${paramIndex}`);
                values.push(changes.OrgName);
                paramIndex++;
            }

            if (changes.Description !== undefined) {
                updates.push(`ddescription = $${paramIndex}`);
                values.push(changes.Description);
                paramIndex++;
            }

            if (changes.Location !== undefined) {
                updates.push(`dparentouid = $${paramIndex}`);
                values.push(changes.Location);
                paramIndex++;
            }

            if (changes.Settings !== undefined) {
                // Normalize to an array of plain objects
                let normalized = changes.Settings;
                // Unwrap double-encoded strings up to 2 times
                for (let i = 0; i < 2 && typeof normalized === 'string'; i++) {
                    try {
                        normalized = JSON.parse(normalized);
                    } catch {
                        break;
                    }
                }
                if (!Array.isArray(normalized)) {
                    normalized = normalized ? [normalized] : [];
                }

                if (normalized.length === 0) {
                    updates.push(`"jsSettings" = ARRAY[]::jsonb[]`);
                } else {
                    const placeholders = normalized.map((_, idx) => `$${paramIndex + idx}::jsonb`).join(', ');
                    updates.push(`"jsSettings" = ARRAY[${placeholders}]`);
                    for (const element of normalized) {
                        values.push(element);
                    }
                    paramIndex += normalized.length;
                }
            }

            if (changes.isactive !== undefined) {
                updates.push(`"bisActive" = $${paramIndex}`);
                values.push(changes.isactive);
                paramIndex++;
            }

            if (updates.length === 0) {
                throw new Error('No valid fields to update');
            }

            const query = `UPDATE tblorganizationalunits SET ${updates.join(', ')} WHERE did = $${paramIndex} RETURNING *`;
            values.push(id);

            const result = await db.query(query, values);
            
            if (result.rows.length === 0) {
                throw new Error('OU not found');
            }

            return result.rows[0];
        } catch (error) {
            throw new Error(error.message);
        }
    }

    async getOUsettings(id) {
        try {
            const query = `SELECT "jsSettings" FROM tblorganizationalunits WHERE did = $1`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }

    async deactiveOU(id) {
        try {
            const query = `UPDATE tblorganizationalunits SET "bisActive" = false WHERE did = $1 RETURNING *`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }

    async reactiveOU(id) {
        try {
            const query = `UPDATE tblorganizationalunits SET "bisActive" = true WHERE did = $1 RETURNING *`;
            const result = await db.query(query, [id]);
            return result.rows[0];
        } catch (error) {
            throw new Error(error);
        }
    }
    
}
module.exports = OUmodel;

//tblorganizationalunits
// | column_name  | data_type                   | character_maximum_length |
// | ------------ | --------------------------- | ------------------------ |
// | did          | uuid                        | null                     |
// | dname        | character varying           | 100                      |
// | ddescription | text                        | null                     |
// | dparentouid  | uuid                        | null                     |
// | tcreatedat   | timestamp without time zone | null                     |
// | jsSettings   | jsonb                       | null                     |
// | bisActive    | boolean                     | null                     |

// tbluserroles
// | column_name   | data_type                   | character_maximum_length |
// | ------------- | --------------------------- | ------------------------ |
// | did           | uuid                        | null                     |
// | duserid       | uuid                        | null                     |
// | droleid       | uuid                        | null                     |
// | douid(this is connected to tblorganizationalunits.did)         | uuid                        | null                     |
// | dsupervisorid | uuid                        | null                     |
// | dmanagerid    | uuid                        | null                     |
// | tassignedat   | timestamp without time zone | null                     |
