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

  const file = urlParams.get("f") ?? "musicolab_default";
  const course = urlParams.get("course") ?? "musicolab_default";
  const room = `${file}::${course}`;

  const websocketProvider = new WebsocketProvider(wsBaseUrl, room, ydoc);
  websocketProvider.on("status", (event) => {
    console.log(event.status);
    if (event.status === "connected") {
      document.title = document.title.replace("🔴", "🟢");
    } else if (event.status === "disconnected") {
      document.title = document.title.replace("🟢", "🔴");
    }
  });

  websocketProvider.on("synced", () => {
    // Show hidden buttons if shared recorded blobs exist
    if (sharedRecordedBlobs.length > 0) {
      window.showHiddenButtons();
    }
  });
  window.websocketProvider = websocketProvider;
  window.awareness = websocketProvider.awareness;

  const sharedRecordedBlobs = ydoc.getArray("blobs");
  sharedRecordedBlobs.observe((event) => {
    for (let i = 0; i < event.changes.delta.length; i++) {
      let delta = event.changes.delta[i];
      if (Array.isArray(delta.insert)) {
        for (let insert of delta.insert) {
          // Turn JS array into Float32Array
          const f32Array = Float32Array.from(insert.data);
          if (!event.transaction.local) {
            window.recordedBuffers.push([f32Array]);
          }
          const blob = window.recordingToBlob(f32Array);
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
      const value = playerConfig.get(key);
      if (!event.transaction.local) {
        switch (key) {
          case "playbackSpeed":
            window.setSpeedRemote(value);
            break;
          case "tempoValue":
            window.setTempoValueRemote(value);
            break;
          case "numerator":
            window.setNumeratorRemote(value);
            break;
          case "denominator":
            window.setDenominatorRemote(value);
            break;
          default:
            console.warn("unsupported configuration variable: ", key);
        }
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
