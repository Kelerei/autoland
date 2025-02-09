interface dataLinkMessageEvent extends Event {
  detail: {
    airports: string;
    waypoints: string;
    navaids: string;
  };
}

document.addEventListener(
  "dataLinkMessageEvent",
  function (event: dataLinkMessageEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const links = event.detail;

    (function () {
      // airport database
      fetch(links.airports)
        .then((resp) => resp.json())
        .then((json) => (navData.airports = json));

      // waypoint database
      fetch(links.waypoints)
        .then((resp) => resp.json())
        .then((json) => (navData.waypoints = json));

      // navaids database
      fetch(links.navaids)
        .then((resp) => resp.json())
        .then((json) => (navData.navaids = json));

      navData.statusCode = 1;
    })();
  }
);

// TODO
/* because it sometimes causes problems for reasons I can not understand: */ // eslint-disable-next-line prefer-const
let navData = {
  statusCode: 0,
  airports: {},
  navaids: {},
  waypoints: {},
};

window.navData = navData;

document.dispatchEvent(new CustomEvent("readyForDataLinks", {}));
