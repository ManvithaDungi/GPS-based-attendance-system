import { Request, Response } from 'express';
import { sendSupportEmail } from '../utils/mailer';
import validator from 'validator';

export const reportIssue = async (req: Request, res: Response) => {
  try {
    const { name, email, subject, description } = req.body ?? {};

    // Basic validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return res.status(400).json({ message: 'Subject is required' });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({ message: 'Description is required' });
    }

    // Additional sanitization recommendations: we escape content inside the mailer template.

    // Send the email via the SMTP utility
    await sendSupportEmail({ name: name.trim(), email: email.trim(), subject: subject.trim(), description: description.trim() });

    return res.status(200).json({ message: 'Support report submitted' });
  } catch (err: any) {
    console.error('Error in reportIssue:', err?.stack || err);
    // Include error message in response for easier debugging in development only
    const responsePayload: any = { message: 'Failed to submit support report' };
    if (process.env.NODE_ENV !== 'production') responsePayload.error = err?.message;
    return res.status(500).json(responsePayload);
  }
};

export default { reportIssue };
