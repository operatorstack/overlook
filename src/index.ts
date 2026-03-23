import "./loadEnv.js";
import { createApp } from "./app.js";
import { hydrateJobSinkIntoStore } from "./jobs/jobSink.js";

const port = Number(process.env.PORT) || 3000;

await hydrateJobSinkIntoStore();

const app = createApp();
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
