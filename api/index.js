import express from 'express';
import { createApiRouter } from './_router.js';

const app = express();

app.use((req, _res, next) => {
  const rawPath = req.query?.__path;
  if (typeof rawPath === 'string' && rawPath.length > 0) {
    req.url = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
  }
  next();
});

const apiRouter = createApiRouter();
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default function handler(req, res) {
  return app(req, res);
}
