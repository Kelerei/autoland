const { exec } = require("child_process");
const { appendFileSync, readJSONSync } = require("fs-extra");
const { join } = require("path");
const { chdir, cwd } = require("process");
const homeDir = require("../main_dir");
const { optimize } = require("requirejs");

/**
 * Builds a script.
 * @param {"autopilot_pp" | "fmc" | "keyboard_mapping" | "spoilers_arming"} scriptName The script to build.
 * @param {string} toAppend What to append to the script.
 */
function defaultScriptBuild(scriptName, toAppend) {
  const scriptLocation = join(homeDir, scriptName);
  chdir(scriptLocation);
  exec("npx tsc", (err) => {
    if (err) {
      throw err;
    }
  });
  const optomizerOptions = readJSONSync("build.json");
  optimize(optomizerOptions, function () {
    appendFileSync(
      join(cwd(), "../autopilot_pp/dist", `${scriptName}.js`),
      toAppend
    );
  });
}

module.exports = defaultScriptBuild;
