// ─────────────────────────────────────────────────────────────────────────────
// SQL Builder Types
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateQueryResult {
  sql: string;
  values: unknown[];
}

// Allow Date objects so 'pg' driver can handle them natively
type FieldValue = string | number | boolean | Date | null | undefined;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Regex pattern for valid SQL identifiers (table names, column names).
 * Only allows alphanumeric characters and underscores.
 */
const SQL_IDENTIFIER_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/**
 * Validates that a string is a safe SQL identifier.
 * Prevents SQL injection in dynamic table/column names.
 *
 * @param identifier - The identifier to validate
 * @param type - Type of identifier for error message
 * @throws Error if identifier is invalid
 */
const validateIdentifier = (identifier: string, type: string): void => {
  if (!identifier || typeof identifier !== 'string') {
    throw new Error(`${type} must be a non-empty string`);
  }

  if (!SQL_IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(
      `Invalid ${type}: "${identifier}". ` +
      `Only alphanumeric characters and underscores are allowed.`
    );
  }

  // Additional check for common SQL keywords
  const reservedWords = ['SELECT', 'DROP', 'DELETE', 'INSERT', 'UPDATE', 'TABLE'];
  if (reservedWords.includes(identifier.toUpperCase())) {
    throw new Error(`${type} cannot be a SQL reserved word: "${identifier}"`);
  }
};

/**
 * Validates that an ID value is a positive integer.
 */
export const validateIdValue = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(`ID must be a positive integer, received: ${value}`);
  }
  return value;
};

// ─────────────────────────────────────────────────────────────────────────────
// Query Builders
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Constructs a dynamic UPDATE SQL query with parameterized values.
 * Validates all identifiers to prevent SQL injection.
 *
 * @param tableName - The table to update (must be valid SQL identifier)
 * @param idColumn - The primary key column name (must be valid SQL identifier)
 * @param idValue - The ID of the row to update (must be positive integer)
 * @param fields - Object containing fields to update (undefined values are skipped)
 * @param startingIndex - The starting bind variable index (default: 1)
 *
 * @returns Object with { sql, values } or null if no fields to update
 * @throws Error if identifiers are invalid or could cause SQL injection
 *
 * @example
 * const query = buildUpdateQuery(
 *   'employees',
 *   'employee_id',
 *   123,
 *   { name: 'John', age: 30, title: undefined } // title will be skipped
 * );
 * // Returns: { sql: 'UPDATE employees SET name = $1, age = $2 WHERE employee_id = $3 RETURNING *', values: ['John', 30, 123] }
 */
export const buildUpdateQuery = (
  tableName: string,
  idColumn: string,
  idValue: number,
  fields: Record<string, FieldValue>,
  startingIndex: number = 1
): UpdateQueryResult | null => {
  // Validate inputs to prevent SQL injection
  validateIdentifier(tableName, 'Table name');
  validateIdentifier(idColumn, 'Column name');
  const validatedId = validateIdValue(idValue);

  if (startingIndex < 1 || !Number.isInteger(startingIndex)) {
    throw new Error('Starting index must be a positive integer');
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = startingIndex;

  // Process each field, skipping undefined values
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    // Validate column name
    validateIdentifier(key, 'Field name');

    setClauses.push(`${key} = $${paramIndex}`);
    paramIndex++;

    // Normalize string values by trimming whitespace
    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    values.push(normalizedValue);
  }

  // Return null if no fields to update
  if (setClauses.length === 0) {
    return null;
  }

  // Add the ID value as the final parameter
  values.push(validatedId);

  const sql = `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${idColumn} = $${paramIndex} RETURNING *`;

  return { sql, values };
};

/**
 * Constructs a dynamic INSERT SQL query with parameterized values.
 *
 * @param tableName - The table to insert into
 * @param fields - Object containing fields to insert (undefined values are skipped)
 *
 * @returns Object with { sql, values } or null if no fields provided
 */
export const buildInsertQuery = (
  tableName: string,
  fields: Record<string, FieldValue>
): UpdateQueryResult | null => {
  validateIdentifier(tableName, 'Table name');

  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) {
      continue;
    }

    validateIdentifier(key, 'Field name');

    columns.push(key);
    placeholders.push(`$${paramIndex}`);
    paramIndex++;

    const normalizedValue = typeof value === 'string' ? value.trim() : value;
    values.push(normalizedValue);
  }

  if (columns.length === 0) {
    return null;
  }

  const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;

  return { sql, values };
};

/**
 * Escapes a LIKE pattern by escaping special characters.
 * Use this when building LIKE clauses with user input.
 *
 * @example
 * const pattern = escapeLikePattern(userInput);
 * const sql = `SELECT * FROM items WHERE name LIKE $1`;
 * const values = [`%${pattern}%`];
 */
export const escapeLikePattern = (input: string): string => {
  return input.replace(/[%_\\]/g, '\\$&');
};

export type { UpdateQueryResult, FieldValue };