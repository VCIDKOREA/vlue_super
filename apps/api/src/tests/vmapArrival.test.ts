import { isVmapDropout, vmapRoomReadyToClose } from "../services/location/vmapArrival.js";

function assert(cond: boolean, message: string) {
  if (!cond) throw new Error(message);
}

const now = Date.parse("2026-10-02T00:00:00Z");
const fresh = new Date(now - 60 * 1000).toISOString();
const stale = new Date(now - 16 * 60 * 1000).toISOString();

assert(!isVmapDropout({ departed: true, arrived: false, updatedAt: fresh }, now), "fresh mover stays in the count");
assert(isVmapDropout({ departed: true, arrived: false, updatedAt: stale }, now), "15 minute silence is a dropout");
assert(!isVmapDropout({ departed: true, arrived: true, updatedAt: stale }, now), "arrived people are not dropouts");
assert(
  vmapRoomReadyToClose(
    [
      { departed: true, arrived: true, updatedAt: fresh },
      { departed: true, arrived: false, updatedAt: stale }
    ],
    now
  ),
  "dropouts do not block closing"
);
assert(
  !vmapRoomReadyToClose(
    [
      { departed: true, arrived: true, updatedAt: fresh },
      { departed: true, arrived: false, updatedAt: fresh }
    ],
    now
  ),
  "a moving person who has not arrived keeps the room"
);
assert(
  !vmapRoomReadyToClose([{ departed: true, arrived: false, updatedAt: stale }], now),
  "only dropouts do not close the room"
);
assert(
  vmapRoomReadyToClose(
    [
      { departed: true, arrived: true, updatedAt: fresh },
      { departed: false, arrived: false, updatedAt: fresh }
    ],
    now
  ),
  "someone who never departed is ignored"
);

console.log("vmap arrival rules ok");
