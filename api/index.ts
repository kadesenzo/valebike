import express from 'express';
import { createApiRouter } from './_router';

const app = express();
const apiRouter = createApiRouter();

app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
