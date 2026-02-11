import http from "http";
import fs from "fs";
import path from "path";

const logFile = path.join(__dirname, "../../SERVER_CRASH.log");
const log = (msg: string) => {
  try {
    fs.appendFileSync(logFile, `${new Date().toISOString()} - ${msg}\n`);
  } catch (e) { console.error(e) }
};

log("Server.ts: Starting pure node execution...");

try {
  const server = http.createServer((req, res) => {
    log(`Received request: ${req.method} ${req.url}`);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "API is working! PURE NODE MODE" }));
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    log(`Server listening on port/pipe: ${PORT}`);
    console.log(`Server listening on port/pipe: ${PORT}`);
  });
} catch (e: any) {
  log(`FATAL ERROR: ${e.message}`);
}
// Export nothing, this is a standalone script effectively
export { };