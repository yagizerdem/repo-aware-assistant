import { spawn, type SpawnOptions } from "node:child_process";
import { access, constants, rm } from "node:fs/promises";

async function spawnWrapper(
  executable: string,
  args: string[],
  options: SpawnOptions,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn(executable, args, options);

      child.once("error", (error) => {
        reject(error);
      });

      child.once("close", (code, signal) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(
          new Error(
            signal
              ? `${executable} was terminated by signal ${signal}`
              : `${executable} exited with code ${code}`,
          ),
        );
      });
    } catch (error) {
      reject(error);
    }
  });
}

async function gitWrapper(
  args: string[],
  options: SpawnOptions,
): Promise<void> {
  return spawnWrapper("git", args, options);
}

async function checkEntryExists(path: string): Promise<boolean> {
  try {
    // F_OK tests if the file/directory is visible to the process
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function rmFileSystemEntry(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true });
}

async function cloneRepository(
  repositoryUrl: string,
  targetDirectory: string,
): Promise<void> {
  if (await checkEntryExists(targetDirectory)) {
    await rmFileSystemEntry(targetDirectory);
  }

  const args = ["clone", "--depth", "1", repositoryUrl, targetDirectory];
  const options: SpawnOptions = {
    stdio: "inherit",
  };

  return gitWrapper(args, options);
}

export { cloneRepository, gitWrapper };
