import express, { Request, Response } from 'express';
import db from './db';
import { buildUpdateQuery } from './utils/sql';
import { sendSuccess, sendError } from './utils/response';

const router = express.Router()

router.get('/', async (_req: Request, res: Response) => {
    try{
        const sql = "SELECT * FROM employees ORDER BY employee_id ASC"
        const result = await db.query(sql);
        sendSuccess(res, result.rows);
    } catch (err:any){
        console.error("ur cooked bud. employyes failed to load", err.message);
        sendError(res, "Failed to load employees");
    }
});

router.post('/', async (req: Request, res: Response) => {
  const { employee_name, job_title, hourly_rate } = req.body as {
    employee_name?: string;
    job_title?: string;
    hourly_rate?: number;
  };

  if ( !employee_name || !job_title || !hourly_rate ) {
    return sendError(res, 'Missing input', 400);
  }

  // employee naem verif
  if (typeof employee_name !== "string" || employee_name.trim().length === 0) {
    return sendError(res, "employee_name must be a non-empty string", 400);
  }

  // job_title verificaiton 
  if (typeof job_title !== "string" || job_title.trim().length === 0) {
    return sendError(res, "job_title must be a non-empty string", 400);
  }

  // rate verif
  let rate: number;
  if (typeof hourly_rate === "number") {
    rate = hourly_rate;
  } else if (typeof hourly_rate === "string" && !isNaN(parseFloat(hourly_rate))) {
    rate = parseFloat(hourly_rate);
  } else {
    return sendError(res, "hourly_rate must be a number", 400);
  }

  const name = employee_name.trim();
  const job = job_title.trim();

  try {
    const insertSql = `
      INSERT INTO employees (employee_name, job_title, hourly_rate, date_hired) VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING employee_id
    `;
    const result = await db.query(insertSql, [name, job, rate]);
    res.status(201);
    sendSuccess(res, result.rows[0], 'Employee created');
  } catch (error) {
    console.error('Error adding new employee:', error);
    sendError(res, 'Failed to add employee.');
  }

});

// Refactored PUT using buildUpdateQuery
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { employee_name, job_title, hourly_rate } = req.body;

  // Helper automatically handles undefined/trimming/parameterization
  const query = buildUpdateQuery('employees', 'employee_id', parseInt(id), {
    employee_name,
    job_title,
    hourly_rate
  });

  if (!query) {
    return sendError(res, 'No fields to update', 400);
  }

  try {
    const result = await db.query(query.sql, query.values);
    if (result.rows.length === 0) {
      return sendError(res, 'Employee not found', 404);
    }
    sendSuccess(res, result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    sendError(res, 'Failed to update employee.');
  }
});

router.delete('/:id', async(req: Request, res: Response) =>{
  const { id } = req.params;

  const employeeId = parseInt(id, 10);
  if (isNaN(employeeId)) {
    return sendError(res, 'Invalid employee_id', 400);
  }

  try {
  const deleteSql = `
    DELETE FROM employees WHERE employee_id = $1
    RETURNING *
  `;
  const result = await db.query(deleteSql, [id]);

  if (result.rows.length === 0) {
    return sendError(res, 'Employee not found', 404);
  }

  sendSuccess(res, { message: 'YOURE FIRED', employee: result.rows[0] });

  } catch (error) {
    console.error('Error updating employee:', error);
    sendError(res, 'Failed to delete employee.');
  }
});

export default router;