const { spawn } = require('child_process');
const fs = require('fs');
const net = require('net');

const DB_PATH = process.env.MONGOD_DB_PATH || 'C:\\data\\db';
const MONGOD_BIN = process.env.MONGOD_BIN || 'C:\\mongodb\\bin\\mongod.exe';

let bin = MONGOD_BIN;
if (!fs.existsSync(bin)) bin = 'mongod';

function waitForPort(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const tryOnce = () => {
      const socket = net.connect({ host, port, timeout: 500 });
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(tryOnce, 300);
      });
      socket.on('timeout', () => {
        socket.destroy();
        if (Date.now() > deadline) resolve(false);
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

const child = spawn(bin, ['--dbpath', DB_PATH], { detached: true, stdio: 'ignore' });
child.on('error', (err) => {
  console.error(`Failed to start mongod (${bin}): ${err.message}`);
  process.exit(1);
});
child.unref();

(async () => {
  console.log(`Starting mongod (${bin}) with dbpath ${DB_PATH} ...`);
  const ok = await waitForPort('127.0.0.1', 27017, 15000);
  console.log(
    ok
      ? 'MongoDB is up and listening on 127.0.0.1:27017.'
      : 'mongod started but is not listening yet — check its error log.'
  );
})();
