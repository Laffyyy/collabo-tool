const db = require('../config/db');

/**
 * Get all organizational units
 */
const getAllOUs = async () => {
  const query = `
    SELECT 
      id,
      name,
      description,
      parent_id,
      created_at,
      updated_at
    FROM organizational_units 
    WHERE active = true
    ORDER BY name ASC
  `;
  
  const { rows } = await db.query(query);
  return rows.map(formatOU);
};

/**
 * Get organizational unit by name
 */
const getOUByName = async (name) => {
  const query = `
    SELECT 
      id,
      name,
      description,
      parent_id,
      created_at,
      updated_at
    FROM organizational_units 
    WHERE name = $1 AND active = true
  `;
  
  const { rows } = await db.query(query, [name]);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Get organizational unit by ID
 */
const getOUById = async (id) => {
  const query = `
    SELECT 
      id,
      name,
      description,
      parent_id,
      created_at,
      updated_at
    FROM organizational_units 
    WHERE id = $1 AND active = true
  `;
  
  const { rows } = await db.query(query, [id]);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Create new organizational unit
 */
const createOU = async (ouData) => {
  const { name, description, parentId } = ouData;
  
  const query = `
    INSERT INTO organizational_units (name, description, parent_id, active, created_at, updated_at)
    VALUES ($1, $2, $3, true, NOW(), NOW())
    RETURNING id, name, description, parent_id, created_at, updated_at
  `;
  
  const { rows } = await db.query(query, [name, description, parentId || null]);
  return formatOU(rows[0]);
};

/**
 * Update organizational unit
 */
const updateOU = async (id, updates) => {
  const updateFields = [];
  const values = [];
  let paramCount = 1;

  if (updates.name !== undefined) {
    updateFields.push(`name = $${paramCount++}`);
    values.push(updates.name);
  }

  if (updates.description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    values.push(updates.description);
  }

  if (updates.parentId !== undefined) {
    updateFields.push(`parent_id = $${paramCount++}`);
    values.push(updates.parentId);
  }

  updateFields.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE organizational_units 
    SET ${updateFields.join(', ')}
    WHERE id = $${paramCount} AND active = true
    RETURNING id, name, description, parent_id, created_at, updated_at
  `;

  const { rows } = await db.query(query, values);
  return rows.length > 0 ? formatOU(rows[0]) : null;
};

/**
 * Get organizational units hierarchy
 */
const getOUHierarchy = async () => {
  const query = `
    WITH RECURSIVE ou_hierarchy AS (
      -- Base case: root OUs (no parent)
      SELECT 
        id,
        name,
        description,
        parent_id,
        created_at,
        updated_at,
        0 as level,
        ARRAY[name] as path
      FROM organizational_units 
      WHERE parent_id IS NULL AND active = true
      
      UNION ALL
      
      -- Recursive case: child OUs
      SELECT 
        ou.id,
        ou.name,
        ou.description,
        ou.parent_id,
        ou.created_at,
        ou.updated_at,
        h.level + 1,
        h.path || ou.name
      FROM organizational_units ou
      INNER JOIN ou_hierarchy h ON ou.parent_id = h.id
      WHERE ou.active = true
    )
    SELECT * FROM ou_hierarchy
    ORDER BY path
  `;
  
  const { rows } = await db.query(query);
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
    createdAt: ouRow.created_at,
    updatedAt: ouRow.updated_at
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
