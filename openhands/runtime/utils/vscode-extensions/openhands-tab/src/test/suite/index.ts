import * as path from 'path';
import Mocha = require('mocha');
import { glob } from 'glob'; // Used to find test files

export async function run(): Promise<void> {
  console.log('[Mocha Test Suite] run() called');
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd', // The TDD UI is commonly used in Mocha
    color: true,
    timeout: 15000 // Increased timeout for extension tests
  });

  const testsRoot = path.resolve(__dirname, '.');
  console.log(`[Mocha Test Suite] testsRoot: ${testsRoot}`);

  try {
    const files = await glob('**/**.test.js', { cwd: testsRoot });
    console.log(`[Mocha Test Suite] Found test files: ${files.join(', ')}`); // ADD THIS
    if (files.length === 0) {
      console.warn('[Mocha Test Suite] No test files found matching **/**.test.js'); // ADD THIS
    }

    files.forEach((f: string) => {
      console.log(`[Mocha Test Suite] Adding file: ${path.resolve(testsRoot, f)}`); // ADD THIS
      mocha.addFile(path.resolve(testsRoot, f));
    });

    console.log('[Mocha Test Suite] Starting Mocha run...'); // ADD THIS
    return new Promise<void>((resolve, reject) => {
      mocha.run((failures: number) => {
        console.log(`[Mocha Test Suite] Mocha run finished. Failures: ${failures}`); // ADD THIS
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
    });
  } catch (err) {
    console.error('[Mocha Test Suite] Error during test setup or execution:', err); // MODIFY THIS
    throw err; // Re-throw to make the promise from run() reject
  }
}
