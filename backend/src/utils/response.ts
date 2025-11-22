import { Response } from 'express';

export const sendSuccess = (res: Response, data: any, message?: string) => {
  res.json({ success: true, data, message });
};

export const sendError = (res: Response, message: string, status = 500) => {
  res.status(status).json({ success: false, message });
};
