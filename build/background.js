"use strict";
// this is a fix for chrome not allowing modules
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const module = {};
/**
 * Sorts scripts for adding.
 * @param {scripts} toSort The scripts to sort through.
 * @returns {scripts} The sorted scripts.
 */
function sortOptions(toSort) {
  const listOfImportance = ["keyboardmapping", "ap", "fmc", "spoilerarming"];
  return toSort.sort(
    (a, b) => listOfImportance.indexOf(a) - listOfImportance.indexOf(b)
  );
}
/**
 * Gets data from chrome storage.
 * @param {string} name The name of the data in chrome storage.
 * @returns {any} The data in chrome storage.
 */
function getStorageData(name) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get([name], (items) => {
      if (chrome.runtime.lastError) {
        return reject(chrome.runtime.lastError);
      }
      resolve(items);
    });
  });
}
/**
 * Saves something to chrome storage.
 * @param {any} toWrite A JSON object containing the data to save.
 * @param {string} name The name to save the object to.
 * @returns The object given that was saved to storage.
 */
function writeToStorage(toWrite, name) {
  const toSave = {};
  toSave[name] = toWrite;
  chrome.storage.sync.set(toSave);
  return toWrite;
}
/**
 * Checks if the given options are valid.
 * @param {options} options The options to check.
 * @returns {options} A valid version of the options (or the current options if they are valid).
 */
function optionsAreValid(toCheck) {
  // FMC can't be on when AP++ is off
  if (!toCheck.ap && toCheck.fmc) {
    toCheck.fmc = false;
  }
  return toCheck;
}
/**
 * Reads valid user selected options from memory. If there are no saved options, returns a default and saves the default.
 * @returns {Promise<options>} A promise that resolves to user options.
 */
async function readOptions() {
  let data;
  await getStorageData("options").then((storage) => {
    if (storage.options) {
      // there are prefs saved, test them
      data = optionsAreValid(storage.options);
    } else {
      // there are no prefs saved, set to default and save
      data = {
        ap: false,
        fmc: false,
        spoilerarming: false,
        keyboardmapping: false,
      };
      writeToStorage(data, "options");
    }
  });
  return data;
}
let options;
(async () => {
  options = await readOptions();
})();
/**
 * Executes a script in the DOM context of a tab.
 * @param {scripts} type The script to add.
 * @param {number} tabId The ID of the tab to add the script to.
 */
function addScript(type, tabId) {
  let hasPermissions;
  chrome.permissions.contains(
    {
      permissions: ["tabs"],
    },
    (result) => {
      hasPermissions = result;
      if (!result) {
        // don't have the needed permissions, open the page to grant permissions
        hasPermissions = false;
        document.body.innerHTML = "";
        chrome.tabs.create({
          url: chrome.runtime.getURL(
            "ui/needspermissions/needspermissions.html"
          ),
        });
      }
    }
  );
  if (!hasPermissions) {
    // we've opened the permissions page, and further action will throw errors
    return;
  }
  console.log(type);
  if (type == "ap") {
    chrome.scripting.executeScript({
      target: { tabId: tabId, allFrames: true },
      files: ["scripts/autopilot_pp_infra/content_communicator.js"],
    });
  }
  chrome.scripting.executeScript({
    target: { tabId: tabId, allFrames: true },
    func: (name) => {
      switch (name) {
        case "ap":
          name = "autopilot_pp";
          break;
        case "spoilerarming":
          name = "spoilers_arming";
          break;
        case "keyboardmapping":
          name = "keyboard_mapping";
          break;
      }
      const scriptTag = document.createElement("script");
      scriptTag.src = chrome.runtime.getURL(`scripts/${name}.js`);
      scriptTag.type = "module";
      scriptTag.onload = () => {
        scriptTag.remove();
      };
      (document.head || document.documentElement).appendChild(scriptTag);
    },
    args: [type],
  });
}
// update cache when storage changes
chrome.storage.onChanged.addListener(async (changes) => {
  if (changes["options"]) {
    const newOptions = await readOptions();
    // add and remove scripts without reloading geo
    const keys = Object.keys(newOptions);
    let reload = false;
    let toLoad = [];
    for (const key of keys) {
      if (newOptions[key] !== options[key]) {
        if (newOptions[key]) toLoad.push(key);
        else reload = true;
      }
    }
    chrome.permissions.contains({ permissions: ["tabs"] }, async (result) => {
      if (result) {
        const [tab] = await chrome.tabs.query({
          url: "https://www.geo-fs.com/geofs.php",
        });
        if (!tab) {
          return;
        }
        if (reload) {
          options = newOptions;
          chrome.tabs.reload(tab.id);
        } else {
          toLoad = sortOptions(toLoad);
          for (const key of toLoad) {
            addScript(key, tab.id);
          }
        }
      }
    });
  }
});
/**
 * Adds the needed scripts listeners. Checks to make sure the extension has the tabs permission before adding the listener.
 * This is only for new tabs. Updates to tabs should be run through the chrome.storage.onChanged listener.
 */
function addScriptsListener() {
  chrome.permissions.contains({ permissions: ["tabs"] }, (result) => {
    if (result) {
      chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
        if (tab.url != "https://www.geo-fs.com/geofs.php") {
          return;
        }
        // the tab is definitely a geo tab, now add the scripts
        let keys = Object.keys(options);
        keys = sortOptions(keys);
        for (const key of keys) {
          if (options[key]) {
            addScript(key, tabId);
          }
        }
      });
    }
  });
}
// add listener when permissions are updated
chrome.permissions.onAdded.addListener(() => {
  addScriptsListener();
});
addScriptsListener();
chrome.runtime.onUpdateAvailable.addListener((details) => {
  writeToStorage({ shouldBeUpdated: true, new: details.version }, "update");
});
chrome.runtime.onInstalled.addListener((details) => {
  writeToStorage({ shouldBeUpdated: false }, "update");
  if (details.reason == "install") {
    writeToStorage(
      { ap: false, fmc: false, spoilerarming: false, keyboardmapping: false },
      "options"
    );
    writeToStorage(false, "devModeEnabled");
    chrome.tabs.create({
      url: chrome.runtime.getURL("ui/oninstall/oninstall.html"),
    });
  }
  if (details.reason == "update") {
    chrome.tabs.create({
      url: chrome.runtime.getURL("changelog/changelog.html"),
    });
  }
});
module.exports = {};
