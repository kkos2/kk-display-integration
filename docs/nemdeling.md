# Nemdeling integration.

The NemDeling integration has 3 types of integrations which fundamentally works in the same way:

`service-message`: Sends Service messages to kk integration
`event`: Sends events displayed as single page events to kk integration
`event-list`: Sends events displayed as list of events to kk integration

## Flow diagram

```mermaid
sequenceDiagram
    participant nemdeling as Nemdeling
    participant integrator as KK Integration
    participant displayapi as Display API

nemdeling ->> integrator: Send data with events: POST /api/v1/nemdeling/TYPE
loop Each slide to be created
    integrator ->> displayapi: Query for slide already exists: GET /v1/slides
    displayapi -->> integrator: List of slides
    integrator ->> integrator: Validate if slide needs update or deleted
    integrator ->> displayapi: Save slide data: PUT /v1/slides/{id}
    integrator ->> displayapi: Delete removed slides: DELETE /v1/slides/{id}
end
