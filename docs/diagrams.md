# ASCII architecture diagrams

**Path (for citations):** `server/docs/diagrams.md`  
**Normative text:** [`systems.md`](./systems.md), [`agentic-subsystem.md`](./agentic-subsystem.md)

Plain-text diagrams for quick reference in terminals and tickets.

## 1) Full loop (slow + fast, human in the middle)

```text
                         +----------------------+
                         | Reference / priority |
                         | (goal stack)         |
                         +----------+-----------+
                                    |
                    +---------------+---------------+
                    | compare to aggregates       |
                    v                               |
         +--------------------+                     |
         | Sensor bus         |                     |
         | (events + rolls)   |                     |
         +---------+----------+                     |
                   ^                               |
                   | emit                          |
         +---------+----------+                     |
         | Runtime (plant)    |                     |
         | FCC / inner loop   |                     |
         | ingest->chunk->   |                     |
         | analyze->sink      |                     |
         +---------+----------+                     |
                   | uses                          |
                   v                               |
         +--------------------+                     |
         | Agent package      |                     |
         | control laws       |                     |
         +--------------------+                     |
                   ^                               |
                   | load after accept             |
                   |                               |
         +---------+----------+                     |
         | Human gate         |                     |
         | AP disconnect /    |                     |
         | accept = deploy    |                     |
         +---------+----------+                     |
                   ^                               |
                   | pending ticket                |
         +---------+----------+                     |
         | Proposer (G)       |---------------------+
         | stick commands     |   error package
         +---------+----------+         ^
                   ^                     |
                   |                     |
         +---------+----------+-----------+
         | Evaluator (H)      |
         | outer loop /       |
         | flight director    |
         +--------------------+
```

## 2) Signal flow (compact)

```text
  Reference -----> Evaluator -----> error package -----> Proposer -----> pending ticket -----> Human gate
                       ^                                        |                |
                       |                                        |                +----> Agent package
                       |                                        |                         |
                       +------------ Sensor bus <----------------+-------------------------+
                                         ^
                                         |
                                    Runtime (uses Agent package)
```

## 3) Inner loop (agentic subsystem)

```text
   target (e.g. git URL)
            |
            v
        +--------+
        | Ingest |  provenance -> sensors
        +---+----+
            |
            v
        +--------+
        | Chunk  |  review units + bounds (mode / policy)
        +---+----+
            |
            v
        +--------+
        | Analyze+-----------> LLM API
        +---+----+
            |
            v
        +--------+
        | Sink   |  findings + outcome -> sensors
        +--------+
```

## 4) Operating modes (one job, one dominant mode)

```text
                    +----------------+
   job request ---->| Host: pick MODE|
                    +-------+--------+
                            |
            +---------------+---------------+
            |               |               |
            v               v               v
      +-----------+   +-----------+   +-------------+
      | DISCOVERY |   | TRIAGE    |   | DEEP-DIVE   |
      | (package) |   | (package) |   | (package)   |
      +-----------+   +-----------+   +-------------+
            |               |               |
            +---------------+---------------+
                            |
                            v
                    same pipeline stages
                    ingest -> chunk -> analyze -> sink
```
