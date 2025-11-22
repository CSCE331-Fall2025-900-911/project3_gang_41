import express, { Request, Response, Router} from 'express';
import db from './db';

const router = express.Router()

router.get('/', async (_req: Request, res: Response) => {
    try{
        const sql = "SELECT * FROM employees ORDER BY employee_id ASC"
        const result = await db.query(sql);
        res.json(result.rows);
    } catch (err:any){
        console.error("ur cooked bud. employyes failed to load", err.message);
        res.status(500).json({message: "no fetchy"});
    }
});

router.post('/', async (req: Request, res: Response) => {
  const { employee_name, job_title, hourly_rate } = req.body as {
    employee_name?: string;
    job_title?: string;
    hourly_rate?: number;
  };

  if ( !employee_name || !job_title || !hourly_rate ) {
    return res.status(400).json({ message: 'missing input' });
  }

  // employee naem verif
  if (typeof employee_name !== "string" || employee_name.trim().length === 0) {
    return res.status(400).json({ error: "employee_name must be a non-empty string" });
  }

  // job_title verificaiton 
  if (typeof job_title !== "string" || job_title.trim().length === 0) {
    return res.status(400).json({ error: "job_title must be a non-empty string" });
  }

  // rate verif
  let rate: number;
  if (typeof hourly_rate === "number") {
    rate = hourly_rate;
  } else if (typeof hourly_rate === "string" && !isNaN(parseFloat(hourly_rate))) {
    rate = parseFloat(hourly_rate);
  } else {
    return res.status(400).json({ error: "hourly_rate must be a number" });
  }

  const name = employee_name.trim();
  const job = job_title.trim();

  try {
    const insertSql = `
      INSERT INTO employees (employee_name, job_title, hourly_rate, date_hired) VALUES ($1, $2, $3, CURRENT_DATE)
      RETURNING employee_id
    `;
    const result = await db.query(insertSql, [name, job, rate]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding new employee:', error);
    res.status(500).json({ message: 'Failed to add employee.' });
  }

});

router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { employee_name, job_title, hourly_rate } = req.body as {
    employee_name?: string;
    job_title?: string;
    hourly_rate?: number;
  };

  if (!employee_name && !job_title && !hourly_rate) {
    return res.status(400).json({ message: 'i have nothing' });
  }

  const updates: string[] = [];
  const values: any[] = [];
  let counter = 1;

  if (employee_name) {
    updates.push(`employee_name = $${counter++}`);
    values.push(employee_name.trim());
  }
  if (job_title) {
    updates.push(`job_title = $${counter++}`);
    values.push(job_title.trim());
  }
  if (hourly_rate !== undefined) {
    updates.push(`hourly_rate = $${counter++}`);
    values.push(hourly_rate);
  }

  values.push(id);

  try {
    const updateSql = `
      UPDATE employees
      SET ${updates.join(', ')}
      WHERE employee_id = $${counter}
      RETURNING *
    `;
    const result = await db.query(updateSql, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Employee not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Failed to update employee.' });
  }
});

router.delete('/:id', async(req: Request, res: Response) =>{
  const { id } = req.params;

  const employeeId = parseInt(id, 10);
  if (isNaN(employeeId)) {
    return res.status(400).json({ message: 'Invalid employee_id' });
  }

  try {
  const deleteSql = `
    DELETE FROM employees WHERE employee_id = $1
    RETURNING *
  `;
  const result = await db.query(deleteSql, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ message: 'Employee not found' });
  }

  res.json({message: "YOURE FIRED", employee: result.rows[0]});

  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ message: 'Failed to update employee.' });
  }
});

export default router;