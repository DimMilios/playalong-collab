import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";

const isSecure = (protocol = "https") => {
    return window.location.protocol.includes(protocol);
};

const productionOrigin = "musicolab.hmu.gr:8080/";
const baseUrl = import.meta.env.DEV
    ? "http://localhost:8080/"
    : `${isSecure() ? "https" : "http"}://${productionOrigin}`;

const wsBaseUrl = import.meta.env.DEV
    ? "ws://localhost:8080"
    : `${isSecure() ? "wss" : "ws"}://${productionOrigin}`;

function setupCollaboration() {
  const ydoc = new Y.Doc();


  const websocketProvider = new WebsocketProvider(wsBaseUrl, "musicolab", ydoc);
  websocketProvider.on("status", (event) => {
    console.log(event.status);
    if (event.status === "connected") {
      document.title = document.title.replace("🔴", "🟢");
    } else if (event.status === "disconnected") {
      document.title = document.title.replace("🟢", "🔴");
    }
  });
  window.websocketProvider = websocketProvider;
  window.awareness = websocketProvider.awareness;

  const sharedRecordedBlobs = ydoc.getArray("blobs");
  sharedRecordedBlobs.observe((event) => {
    // console.log('Received YArray event', event);

    for (let i = 0; i < event.changes.delta.length; i++) {
      let delta = event.changes.delta[i];
      // change.insert[0].client !== websocketProvider.awareness.clientID &&
      if (Array.isArray(delta.insert)) {
        for (let insert of delta.insert) {
          let blob = new Blob([insert.data]);
          window.createDownloadLink(blob, insert.id);
        }
      }
    }
  });

  const deletedSharedRecordedBlobIds = ydoc.getArray("deletedIds");
  deletedSharedRecordedBlobIds.observe((event) => {
    console.log("Received YArray delete collab id event", event);
    for (let i = 0; i < deletedSharedRecordedBlobIds.length; i++) {
      let id = deletedSharedRecordedBlobIds.get(i);
      document
        .querySelector(`.hidden-delete-btn[data-collab-id="${id}"]`)
        ?.click();
    }
  });

  // Configuration variables for the playback player
  // e.g. shared playback speed amongst collaborators
  const playerConfig = ydoc.getMap("playerConfig");
  playerConfig.observe((event) => {
    for (let key of event.keysChanged) {
      switch (key) {
        case "playbackSpeed":
          if (!event.transaction.local) {
            window.setSpeedRemote(playerConfig.get(key));
          }
          break;
        default:
          console.warn("unsupported configuration variable: ", key);
      }
    }
  });

  window.ydoc = ydoc;
  window.sharedRecordedBlobs = sharedRecordedBlobs;
  window.deletedSharedRecordedBlobIds = deletedSharedRecordedBlobIds;
  window.playerConfig = playerConfig;
}

if (!!window.Collab) {
  setupCollaboration();
}
