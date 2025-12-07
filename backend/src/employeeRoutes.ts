import express, { Request, Response } from 'express';
import db from './db';
import { buildUpdateQuery } from './utils/sql';
import { sendSuccess, sendError, sendBadRequest, sendNotFound } from './utils/response';
import { Employee } from '@project3/shared';

const router = express.Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const sql = "SELECT * FROM employees ORDER BY employee_id ASC";
    const result = await db.query<Employee>(sql);
    return sendSuccess(res, result.rows);
  } catch (err: any) {
    console.error("[Employees] Failed to load:", err.message);
    return sendError(res, "Failed to load employees");
  }
});

router.post('/', async (req: Request, res: Response) => {
  const { employee_name, job_title, hourly_rate } = req.body;

  if (!employee_name || !job_title || !hourly_rate) {
    return sendBadRequest(res, 'Missing required fields');
  }

  const name = String(employee_name).trim();
  const job = String(job_title).trim();
  const rate = Number(hourly_rate);

  if (isNaN(rate)) {
    return sendBadRequest(res, "hourly_rate must be a number");
  }

  // Generate creds
  const generatedEmail = name.toLowerCase().replace(/\s+/g, '.') + '@gmail.com';
  const generatedPassword = name.split(' ')[0] + '123!';

  try {
    const insertSql = `
      INSERT INTO employees (employee_name, job_title, hourly_rate, email, password, date_hired) 
      VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
      RETURNING *
    `;
    const result = await db.query(insertSql, [name, job, rate, generatedEmail, generatedPassword]);
    
    return sendSuccess(res, { 
      ...result.rows[0], 
      // Return these once so they can be shown to the manager
      email: generatedEmail, 
      password: generatedPassword 
    }, 'Employee created', 201);

  } catch (error) {
    console.error('[Employees] Creation error:', error);
    return sendError(res, 'Failed to add employee');
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return sendBadRequest(res, 'Invalid employee ID');

  const { employee_name, job_title, hourly_rate, password } = req.body;

  // Uses the new, safer buildUpdateQuery signature
  const query = buildUpdateQuery(
    'employees', 
    'employee_id', 
    id, 
    {
      employee_name,
      job_title,
      hourly_rate,
      password 
    }
  );

  if (!query) {
    return sendBadRequest(res, 'No fields to update');
  }

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Employee not found');
    }
    return sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('[Employees] Update error:', error);
    return sendError(res, 'Failed to update employee');
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return sendBadRequest(res, 'Invalid employee ID');

  try {
    const result = await db.query('DELETE FROM employees WHERE employee_id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Employee not found');
    }

    return sendSuccess(res, { message: 'Employee terminated', employee: result.rows[0] });
  } catch (error) {
    console.error('[Employees] Delete error:', error);
    return sendError(res, 'Failed to delete employee');
  }
});

export default router;