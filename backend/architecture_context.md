# Backend Architecture Specification: Real-Time Transit Tracking System

## 1. System Objective

A real-time, closed-system transit tracking application (WhereIsMyTrain style) consisting of a Node.js REST/WebSocket backend. It serves three distinct flows:

* **Admin Flow:** Creation of fixed stations and static physical routes using the OSRM routing engine.
* **Driver Flow:** High-frequency (15s) GPS telemetry broadcast from mobile web browsers.
* **Passenger Flow:** Read-only access to text-based station search, live bus tracking, and $O(1)$ ETA calculations.

## 2. Technical Stack

* **Runtime:** Node.js with TypeScript.
* **Web Framework:** Express.js.
* **Cold Storage (Database):** MongoDB (Mongoose) for fixed graph data (Stations, Routes, Users, Vehicles).
* **Hot Storage (Memory):** Redis (`ioredis`) for live state (Active Buses) and Pub/Sub for WebSockets.
* **Real-time Protocol:** `ws` or `Socket.io`.
* **External APIs:** OSRM (Open Source Routing Machine) for Polyline/Distance generation.

## 3. Core Architectural Rules & Constraints

The agent must strictly adhere to these constraints to prevent architectural drift:

1. **Coordinate Format:** All spatial data across the stack MUST use `[longitude, latitude]` to align with GeoJSON and MapLibre GL JS.
2. **Zero Live Geometry Math (Passenger Queries):** The Node.js server must never execute spatial math (like Haversine formulas) during live passenger queries. Passenger queries are $O(1)$. However, the server *will* perform point-to-line snapping (e.g. using turf.js) when receiving high-frequency driver GPS pings to map them to the route's `geometryIndex` before caching in Redis.
3. **No Passenger Geospatial Queries:** Do not use MongoDB `$near` or `$geoWithin` queries for passengers. The system uses a strict "Autocomplete Search" design relying on a `$text` index on `Station.stationName`.
4. **Redis-First Live State:** Passenger queries for live ETAs must read the bus's current location index from Redis, subtract it from the passenger's station index in the MongoDB `cumulativeDistances` array, and return the result.

## 4. Database Schemas (MongoDB)

### 4.1 User Schema

* `clerkId` (String, unique)
* `role` (Enum: `['ADMIN', 'DRIVER']`)
* `licenseNumber` (String, required if DRIVER)

### 4.2 Vehicle Schema

* `vehicleId` (String, unique)
* `capacity` (Number)
* `licensePlate` (String, unique)

### 4.3 Station Schema

* `stationName` (String, Text Indexed)
* `location` (GeoJSON Point: `[lon, lat]`)

### 4.4 Route Schema (The Core Graph)

* `routeName` (String, unique)
* `stops` (Array of Objects):
* `stationId` (ObjectId, ref: Station)
* `order` (Number)
* `geometryIndex` (Number: Points to the exact index in the `geometry` array where this stop sits).
* `distanceToNext` (Number: Meters to next stop).


* `geometry` (GeoJSON LineString: The full OSRM road path).
* `cumulativeDistances` (Array of Numbers: Maps 1:1 with `geometry`. Index $i$ represents the total meters from the start of the route).
* **Indexes:** Compound index on `stops.stationId`.

### 4.5 Trip State (Redis Only)

Trips do not exist in MongoDB. A Trip is an active state linking a `Vehicle` to a `Route`, stored entirely in Redis (e.g., `bus:<id>:state`).

## 5. Development Roadmap (Sprints)

* **Sprint 1: Infrastructure & Data Layer**
* Initialize Express, TypeScript, Mongoose, and Redis connections.
* Implement the exact Mongoose schemas for `User`, `Station`, `Vehicle`, and `Route`.


* **Sprint 2: The Graph Builder (OSRM Integration)**
* Build `POST /api/routes`.
* Implement service to accept an array of `stationIds`, fetch their coordinates, and call the public OSRM API.
* Process the OSRM `LineString` and `legs` to generate the `cumulativeDistances` array and `geometryIndex` for each stop before saving to MongoDB.


* **Sprint 3: The Live Telemetry Engine**
* Initialize the WebSocket server.
* Build `POST /api/trips/start` to add buses to a Redis `active_buses` Set.
* Implement a socket listener for driver pings that writes to a Redis Hash (`bus:<id>:state`) and fires a Redis `PUBLISH`.


* **Sprint 4: Passenger Discovery API**
* Build `GET /api/stations/search` using MongoDB `$text`.
* Build `GET /api/routes/find?from=<id>&to=<id>`. Query Mongo for matching routes where `order_from < order_to`, then fetch active buses on those routes from Redis.


* **Sprint 5: Pub/Sub & ETA Broadcast**
* Implement passenger WebSocket room joining logic.
* Subscribe Node.js to Redis `SUBSCRIBE` channels. Forward live payloads to connected passenger WebSockets.
* Implement the $O(1)$ ETA subtraction logic using the `cumulativeDistances` array.
