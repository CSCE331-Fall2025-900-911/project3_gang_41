// Entrypoint used by Render.com (or `node index.js`).
// Behavior:
// 1) If backend/dist/server.js exists, require it (fast, production-ready).
// 2) Else if ts-node is installed, register ts-node and require backend/src/server.ts (useful for quick deploys).
// 3) Otherwise spawn `npm --prefix backend run start` so the backend's start script runs in a subprocess.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const backendDist = path.join(__dirname, 'backend', 'dist', 'server.js');
const backendSrc = path.join(__dirname, 'backend', 'src', 'server.ts');

function tryRequire(file) {
	try {
		require(file);
		console.log(`Started backend by requiring: ${file}`);
		return true;
	} catch (err) {
		console.error(`Failed to require ${file}:`, err && err.message ? err.message : err);
		return false;
	}
}

if (fs.existsSync(backendDist)) {
	// Production: run the compiled JS
	tryRequire(backendDist);
} else if (fs.existsSync(backendSrc)) {
	// Try to use ts-node if available (dev-friendly)
	try {
		// Prefer @swc-node/register or ts-node/register if present
		try {
			require('@swc-node/register');
			console.log('Using @swc-node/register to run TypeScript source.');
			tryRequire(backendSrc);
		} catch (e) {
			// fallback to ts-node
			try {
				require('ts-node/register');
				console.log('Using ts-node/register to run TypeScript source.');
				tryRequire(backendSrc);
			} catch (e2) {
				console.warn('ts-node not available to run TypeScript source in-process. Falling back to npm start.');
				// fallback to spawning npm start below
				spawnStart();
			}
		}
	} catch (e) {
		console.warn('Could not run TypeScript source in-process:', e && e.message ? e.message : e);
		spawnStart();
	}
} else {
	// Nothing to require; try to run the backend start script
	spawnStart();
}

function spawnStart() {
	console.log('Spawning `npm --prefix backend run start`');
	const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
	const child = spawn(cmd, ['--prefix', 'backend', 'run', 'start'], {
		stdio: 'inherit',
		env: process.env,
	});

	child.on('exit', (code, signal) => {
		if (signal) {
			console.log(`Backend start process got signal ${signal}`);
			process.exit(1);
		} else {
			console.log(`Backend exited with code ${code}`);
			process.exit(code);
		}
	});

	child.on('error', (err) => {
		console.error('Failed to start backend process:', err);
		process.exit(1);
	});
}

// If this process is not used to start the backend (e.g. require() started it), keep the process alive
// until explicitly terminated by the backend. Nothing else needed here.

