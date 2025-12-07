import express, { Request, Response } from 'express';
import db from './db';
import { buildInsertQuery, buildUpdateQuery } from './utils/sql';
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
    const query = buildInsertQuery('employees', {
      employee_name: name,
      job_title: job,
      hourly_rate: rate,
      email: generatedEmail,
      password: generatedPassword,
      date_hired: new Date()
    });

    if (!query) return sendBadRequest(res, 'Invalid data');

    const result = await db.query(query.sql, query.values);

    return sendSuccess(res, { 
      ...result.rows[0], 
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