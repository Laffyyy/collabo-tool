const { getPool } = require('../config/db');

/**
 * Get all organizational units
 */
const getAllOUs = async () => {
  const pool = getPool();
  const query = `
    SELECT 
      did as id,
      dname as name,
      ddescription as description,
      dparentouid as parent_id,
      tcreatedat as created_at,
      "bisActive" as active
    FROM tblorganizationalunits 
    WHERE "bisActive" = true
    ORDER BY dname ASC
  `;
  
  const { rows } = await pool.query(query);
  return rows.map(formatOU);
};

/**
 * Get organizational unit by name
 */
const getOUByName = async (name) => {
  const pool = getPool();
  const query = `
    SELECT 
      did as id,
      dname as name,
      ddescription as description,
      dparentouid as parent_id,
      tcreatedat as created_at,
      "bisActive" as active
    FROM tblorganizationalunits 
    WHERE dname = $1 AND "bisActive" = true
  `;
  
  const { rows } = await pool.query(query, [name]);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Get organizational unit by ID
 */
const getOUById = async (id) => {
  const pool = getPool();
  const query = `
    SELECT 
      did as id,
      dname as name,
      ddescription as description,
      dparentouid as parent_id,
      tcreatedat as created_at,
      "bisActive" as active
    FROM tblorganizationalunits 
    WHERE did = $1 AND "bisActive" = true
  `;
  
  const { rows } = await pool.query(query, [id]);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Create new organizational unit
 */
const createOU = async (ouData) => {
  const pool = getPool();
  const { name, description, parentId } = ouData;
  
  const query = `
    INSERT INTO tblorganizationalunits (dname, ddescription, dparentouid, "jsSettings", "bisActive", tcreatedat)
    VALUES ($1, $2, $3, '{}', true, NOW())
    RETURNING did as id, dname as name, ddescription as description, dparentouid as parent_id, tcreatedat as created_at
  `;
  
  const { rows } = await pool.query(query, [name, description, parentId || null]);
  return formatOU(rows[0]);
};

/**
 * Update organizational unit
 */
const updateOU = async (id, updates) => {
  const pool = getPool();
  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    updateFields.push(`dname = $${paramCount++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    updateFields.push(`ddescription = $${paramCount++}`);
    values.push(updates.description);
  }

  if (updates.parentId !== undefined) {
    updateFields.push(`dparentouid = $${paramCount++}`);
    values.push(updates.parentId);
  }

  if (updateFields.length === 0) {
    return await getOUById(id);
  }

  values.push(id);

  const query = `
    UPDATE tblorganizationalunits 
    SET ${updateFields.join(', ')}
    WHERE did = $${paramCount} AND "bisActive" = true
    RETURNING did as id, dname as name, ddescription as description, dparentouid as parent_id, tcreatedat as created_at
  `;

  const { rows } = await pool.query(query, values);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Get organizational units hierarchy
 */
const getOUHierarchy = async () => {
  const pool = getPool();
  const query = `
    WITH RECURSIVE ou_hierarchy AS (
      -- Base case: root OUs (no parent)
      SELECT 
        did as id,
        dname as name,
        ddescription as description,
        dparentouid as parent_id,
        tcreatedat as created_at,
        0 as level,
        ARRAY[dname] as path
      FROM tblorganizationalunits 
      WHERE dparentouid IS NULL AND "bisActive" = true
      
      UNION ALL
      
      -- Recursive case: child OUs
      SELECT 
        ou.did as id,
        ou.dname as name,
        ou.ddescription as description,
        ou.dparentouid as parent_id,
        ou.tcreatedat as created_at,
        h.level + 1,
        h.path || ou.dname
      FROM tblorganizationalunits ou
      INNER JOIN ou_hierarchy h ON ou.dparentouid = h.id
      WHERE ou."bisActive" = true
    )
    SELECT * FROM ou_hierarchy
    ORDER BY path
  `;
  
  const { rows } = await pool.query(query);
  return rows.map(row => ({
    ...formatOU(row),
    level: row.level,
    path: row.path
  }));
};

/**
 * Format organizational unit data
 */
const formatOU = (ouRow) => {
  if (!ouRow) return null;

  return {
    id: ouRow.id,
    name: ouRow.name,
    description: ouRow.description,
    parentId: ouRow.parent_id,
    active: ouRow.active,
    createdAt: ouRow.created_at
  };
};

module.exports = {
  getAllOUs,
  getOUByName,
  getOUById,
  createOU,
  updateOU,
  getOUHierarchy,
  formatOU
};
