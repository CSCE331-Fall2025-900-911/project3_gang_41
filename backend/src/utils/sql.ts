/**
 * Constructs a dynamic UPDATE SQL query.
 * 
 * @param tableName - The table to update
 * @param idColumn - The primary key column name (e.g., 'employee_id')
 * @param idValue - The ID of the row to update
 * @param fields - An object containing the fields to update (undefined/null values are ignored)
 * @param startingIndex - The starting bind variable index (default 1)
 * 
 * @returns Object containing { sql, values } or null if no fields to update
 */
export const buildUpdateQuery = (
  tableName: string,
  idColumn: string,
  idValue: number,
  fields: Record<string, any>,
  startingIndex: number = 1
) => {
  const setClauses: string[] = [];
  const values: any[] = [];
  let i = startingIndex;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      setClauses.push(`${key} = $${i++}`);
      // Trim strings, keep numbers/nulls as is
      values.push(typeof value === 'string' ? value.trim() : value);
    }
  }

  if (setClauses.length === 0) return null;

  const sql = `
    UPDATE ${tableName}
    SET ${setClauses.join(', ')}
    WHERE ${idColumn} = $${i}
    RETURNING *
  `;
  values.push(idValue);

  return { sql, values };
};