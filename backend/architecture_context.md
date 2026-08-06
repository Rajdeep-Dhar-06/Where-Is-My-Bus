# Backend Architecture Specification: Real-Time Transit Tracking System

## 1. System Objective

A real-time, single-server transit tracking application (WhereIsMyTrain style) consisting of a Node.js REST/WebSocket backend. It serves three distinct flows:

* **Admin Flow:** Creation of fixed stations and static physical routes using the OSRM routing engine with linear pre-interpolation.
* **Driver Flow:** High-frequency (3–15s) GPS telemetry broadcast from mobile web browsers.
* **Passenger Flow:** Read-only access to text-based station search, live bus tracking, and $O(1)$ ETA calculations.

---

## 2. Technical Stack

* **Runtime:** Node.js with TypeScript.
* **Web Framework:** Express.js.
* **Cold Storage (Database):** MongoDB (Mongoose) for fixed graph data (Stations, Routes, Users, Vehicles).
* **Hot Storage (Process Memory):** Node.js In-Memory State (`Map` Singleton) for active bus telemetry and trip state.
* **Real-Time Protocol:** `Socket.io` (utilizing native Socket.io Rooms for broadcasting).
* **Geospatial & Routing Utilities:** Public OSRM API (Raw Polyline/Distance Generation) + `Turf.js` (Linear pre-interpolation during route creation).

---

## 3. Core Architectural Rules & Constraints

1. **Coordinate Format:** All spatial data across the stack MUST use `[longitude, latitude]` to align with standard GeoJSON and MapLibre GL JS.
2. **Pre-Interpolated Geometry (Zero Live Trigonometric Math):** Polyline paths returned by OSRM must be linearly pre-interpolated during route creation into dense, uniformly spaced segments (e.g., 10-meter chunks using Turf.js `lineChunk`). This converts live driver GPS snapping into an $O(1)$ nearest-index lookup and keeps CPU overhead minimal.
3. **No Live Passenger Geospatial Queries:** The Node.js server must never execute spatial queries (like Haversine or `$near`) during live passenger read requests. Station searches strictly use a MongoDB `$text` index on `Station.stationName`.
4. **In-Memory Hot State:** Driver pings update a global in-memory state store (`activeBuses` Map). Passenger $O(1)$ ETA calculations subtract the bus's `lastPassedIndex` distance from the passenger's station distance using the route's pre-calculated `cumulativeDistances` array.
5. **Single-Server Scope:** Real-time events are broadcast directly via native Socket.io rooms (e.g., `route_<id>`). Redis Pub/Sub and external caching layers are deliberately omitted to maximize simplicity and eliminate network hop latency.

---

## 4. Database Schemas & State Management

### 4.1 MongoDB Collections (Cold Storage)

#### User Schema

* `clerkId` (String, unique)
* `role` (Enum: `['ADMIN', 'DRIVER']`)
* `licenseNumber` (String, required if DRIVER)

#### Vehicle Schema

* `vehicleId` (String, unique)
* `capacity` (Number)
* `licensePlate` (String, unique)

#### Station Schema

* `stationName` (String, Text Indexed)
* `location` (GeoJSON Point: `{ type: 'Point', coordinates: [lon, lat] }`)
* `isActive` (Boolean, default: true)

#### Route Schema (The Core Graph)

* `routeName` (String, unique)
* `isActive` (Boolean, default: true)
* `stops` (Array of Objects):
* `stationId` (ObjectId, ref: Station)
* `order` (Number)
* `geometryIndex` (Number: Array index pointing to the exact interpolated point where this stop resides).
* `distanceToNext` (Number: Meters to next stop).


* `geometry` (GeoJSON LineString: The dense, 10-meter interpolated road path).
* `cumulativeDistances` (Array of Numbers: Maps 1:1 with `geometry`. Index $i$ represents total meters from the start of the route).
* **Indexes:** Compound index on `stops.stationId`.

### 4.2 In-Memory Hot State (Node.js Process RAM)

Active trip state resides entirely inside the Node.js process memory via a global thread-safe Map structure:

```typescript
interface ActiveBusState {
    busId: string;
    routeId: string;
    driverId: string;
    lastPassedIndex: number;
    speedKmh: number;
    lastPingTimestamp: number;
}

// Global In-Memory Store
export const activeBuses = new Map<string, ActiveBusState>();
```

---

## 5. Development Roadmap (Sprints)

### Sprint 1: Infrastructure & Data Layer

* Initialize Express, TypeScript, Mongoose, and Socket.io server.
* Implement Mongoose schemas for `User`, `Station`, `Vehicle`, and `Route`.
* Configure central global error handling for Express v5.

### Sprint 2: The Graph Builder & Pre-Interpolation (OSRM)

* Build `POST /api/routes` and `PUT /api/routes/:id`.
* Fetch raw OSRM geometry (`overview=full&annotations=distance`).
* **Interpolation Pipeline:** Intercept raw OSRM output using Turf.js `lineChunk` to chop straightaways and curves into uniform 10-meter segments.
* Rebuild `cumulativeDistances` and map `geometryIndex` for each bus stop before persisting to MongoDB.
* Implement Zod validation middleware for all station and route endpoints.

### Sprint 3: The Live Telemetry Engine (WebSockets & In-Memory State)

* Initialize Socket.io connection handlers and room management.
* Build `POST /api/trips/start` to register an active vehicle in the `activeBuses` memory Map.
* Implement driver socket listener for GPS pings (`driver:telemetry`).
* Snap GPS coordinates to the pre-interpolated `geometryIndex` and update the in-memory Map.
* Emit live bus location payloads directly to the target Socket.io room (`route_<routeId>`).

### Sprint 4: Passenger Discovery API

* Build `GET /api/stations/search` using MongoDB `$text` search and `$meta: 'textScore'` relevance sorting.
* Build `GET /api/routes/find?from=<id>&to=<id>` to identify directionally valid routes (`order_from < order_to`).
* Attach live active bus data from the in-memory state store to search results.

### Sprint 5: Passenger Live Room Subscriptions & $O(1)$ ETA Engine

* Implement passenger socket logic for joining and leaving route rooms (`passenger:join_route`).
* Calculate live ETAs in $O(1)$ time:

$$\text{Remaining Distance} = \text{cumulativeDistances}[\text{stationIndex}] - \text{cumulativeDistances}[\text{busIndex}]$$


* Stream lightweight ETA updates to subscribed room clients at high frequency.

---

## 6. Architectural Trade-Offs & Open Discussion Points

This specification remains open to further optimization and discussion around the following architectural trade-offs:

| Component | Current Selection | Alternative Option | Primary Trade-Off |
| --- | --- | --- | --- |
| **State Storage** | Node.js Process RAM (`Map`) | Redis In-Memory DB | Process RAM is extremely fast (nanosecond access) with zero external setup, but state is lost if the Node process restarts. Redis enables persistent state and horizontal scaling across multiple servers. |
| **Geometry Density** | Pre-Interpolated (10m Chunks) | Standard Sparse OSRM | Pre-interpolation increases MongoDB document size slightly (~24 KB per route), but reduces CPU load during live driver pings from heavy trigonometric math to simple index matching. |
| **OSRM Outages** | Hard Fail (Abort Route Creation) | Straight-Line Fallback | Hard failure prevents corrupt route paths, but blocks route creation if the public OSRM server is temporarily unreachable. |
| **Station Deletion** | Soft Delete (`isActive: false`) | Cascading Route Mutation | Soft deletion is fast and non-destructive, but leaves inactive station references inside existing route polylines unless a validation check prevents deletion of active route stations. |
