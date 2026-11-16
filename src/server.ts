import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { initDb } from './db';
import { HttpError, router } from './routes';

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use('/api', router);
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const port = Number(process.env.PORT ?? 3000);
initDb()
  .then(() => {
    app.listen(port, () => console.log(`Recipe Box running on http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Could not start: database unavailable', err);
    process.exit(1);
  });
