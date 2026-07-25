const { spawn } = require("node:child_process");
const { access, constants, rm } = require("node:fs/promises");

async function spawnWrapper(executable, args, options) {
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

async function gitWrapper(args, options) {
  return spawnWrapper("git", args, options);
}

async function checkEntryExists(path) {
  try {
    // F_OK tests if the file/directory is visible to the process
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function rmFileSystemEntry(path) {
  await rm(path, { recursive: true, force: true });
}

async function cloneRepository(repositoryUrl, targetDirectory) {
  if (await checkEntryExists(targetDirectory)) {
    await rmFileSystemEntry(targetDirectory);
  }

  const args = ["clone", "--depth", "1", repositoryUrl, targetDirectory];
  const options = {
    stdio: "inherit",
  };

  return gitWrapper(args, options);
}

module.exports = { cloneRepository, gitWrapper };
