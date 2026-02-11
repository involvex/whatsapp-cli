import * as readline from "readline";

export function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

export function promptUser(
  rl: readline.Interface,
  question: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      rl.question(question, answer => {
        resolve(answer);
      });
    } catch (error) {
      reject(error);
    }
  });
}
