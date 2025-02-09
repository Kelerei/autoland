import globalVariables from "./globalVariables";

export default () => {
  // add the spoilers arming to the controls
  controls.spoilersArming = false;
  controls.setters.spoilersArming = {
    label: "Spoiler Arming",
    set: function () {
      if (globalVariables.enabled()) {
        if (!geofs.aircraft.instance.groundContact) {
          controls.spoilersArming = !controls.spoilersArming;
          if (window.fmc?.ready) {
            const log = window.fmc.require("./source/log.ts").log;
            const msg = `${
              controls.spoilersArming ? "Armed" : "Disarmed"
            } Spoilers Arming`;
            log.update(msg);
          }
        } else {
          controls.spoilersArming = false;
        }
      }
    },
    unset: function () {
      // this is here only for typescript
    },
  };

  // add the keybind for the spoilers arming
  if (window.keyboard_mapping) {
    const addKeybind = window.keyboard_mapping.require(
      "./source/addKeybind.ts"
    ).default;
    addKeybind(
      "keyDown",
      "Spoilers Arming",
      () => {
        if (typeof globalVariables.enabled !== "undefined") {
          globalVariables.enabled(true);
          controls.setters.spoilersArming.set();
        }
      },
      {
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        code: window.keyboard_mapping
          .require("./source/keyboardMapping.ts")
          .default()["Airbrake toggle (on/off)"].code,
      }
    );
    // Add an event handling the pressing of the airbrakes toggle key
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      const keybind = window.keyboard_mapping
        .require("./source/keyboardMapping.ts")
        .default()["Airbrake toggle (on/off)"];
      if (
        e.code == keybind.code &&
        e.ctrlKey == keybind.ctrlKey &&
        e.altKey == keybind.altKey &&
        e.shiftKey == keybind.shiftKey
      ) {
        // spoilers will be activated.
        globalVariables.enabled(false);
        if (controls.spoilersArming && window.fmc?.ready) {
          const log = window.fmc.require("./source/log.ts").log;
          const msg = "Disarmed Spoilers Arming";
          log.update(msg);
        }
        controls.spoilersArming = false;
      }
    });
  } else {
    const keydownTrigger = controls.keyDown;
    controls.keyDown = function (event) {
      if (typeof globalVariables.enabled !== "undefined") {
        if (
          event.which ===
          geofs.preferences.keyboard.keys["Airbrake toggle (on/off)"].keycode
        ) {
          if (event.shiftKey) {
            globalVariables.enabled(true);
            controls.setters.spoilersArming.set();
          } else {
            globalVariables.enabled(false);
            controls.spoilersArming = false;
            controls.setters.setAirbrakes.set();
            if (window.fmc?.ready) {
              const log = window.fmc.require("./source/log.ts").log;
              const msg = "Disarmed Spoilers Arming";
              log.update(msg);
            }
          }
        } else {
          keydownTrigger(event);
        }
      } else {
        keydownTrigger(event);
      }
    };
  }
};
