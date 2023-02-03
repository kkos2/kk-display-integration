# Twenty Three Video integration.

## Flow diagram

```mermaid
sequenceDiagram
    participant integrator as KK Integration
    participant bookbyen as Twenty Three Video
    participant displayapi as Display API

integrator ->> integrator: Trigger process with cron
integrator ->> displayapi: Query for slides: GET /v1/slides
displayapi -->> integrator: Slide list
loop Slide
    integrator ->> bookbyen: Query for feed: GET /api/photo/list
    bookbyen -->> integrator: Feed data
    integrator ->> integrator: Validate if slide needs update
    integrator ->> displayapi: Save slide data: PUT /v1/slides/{id}
end