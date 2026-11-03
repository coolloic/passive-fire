# Team Leader Readiness

Helps a team leader confirm, before going on site, that the products needed for planned passive fire work are available, and escalate shortages to the business.

## People

**Team Leader**:
The person who schedules crews and checks, before going on site, that planned work can be carried out.
_Avoid_: Supervisor, foreman

**Project Manager**:
The person in the business who receives escalations and resolves shortages.
_Avoid_: Back office, manager, procurement

**Crew**:
A group of operatives who install fire stopping together under a team leader.
_Avoid_: Team, gang

## Catalogue

**Solution**:
A catalogue entry specifying how to fire-stop a given service through a given substrate at a given fire rating.
_Avoid_: System, detail, spec

**Scenario**:
A type of penetration on site, defined by service type, service size, orientation, substrate and required fire rating, that needs fire stopping.
_Avoid_: Penetration type, case

**Linear Joint**:
A scenario that seals a long, narrow gap (one dimension of 75 mm or less) rather than a service.
_Avoid_: Blank, gap

**Blank Opening**:
A scenario that closes an opening with no service passing through it.
_Avoid_: Blank, hole

**Nominated Solution**:
The solution approved for a scenario on a particular site.
_Avoid_: Selected solution, chosen solution

**Candidate Solution**:
A catalogue solution that might replace a scenario's nominated solution. It is not compliant for that scenario until a project manager approves it as the new nominated solution.
_Avoid_: Alternative, equivalent, substitute

**Product**:
A stocked item that a solution consumes when installed, such as a sealant, collar or batt.
_Avoid_: Material, component, part

**Product Requirement**:
The quantity of a product that one penetration needs when installed with a given solution.
_Avoid_: Bill of materials, recipe, usage

## Planning

**Site**:
A building project where planned work takes place.
_Avoid_: Project, job

**Planned Work**:
The scenarios, with penetration counts, that a crew will install at a site on a given date.
_Avoid_: Job, task, work package

**Stock**:
The quantity of each product the business holds that is available for planned work.
_Avoid_: Inventory, balance

**Expected Delivery**:
A quantity of a product due to arrive into stock on a known date.
_Avoid_: Order, shipment, PO

**Allocation**:
The share of stock and expected deliveries assigned to a planned work. Earlier planned work is allocated first.
_Avoid_: Reservation, booking

## Readiness

**Readiness**:
Whether planned work can be carried out with the products allocated to it. It is **Ready**, **Short** or **Unknown** for each scenario. The planned work takes its worst scenario state, in the order Short, Unknown, Ready.
_Avoid_: Availability, status

**Ready**:
Every product the scenario needs is allocated in full, whether from stock or from expected deliveries arriving before the planned work date.
_Avoid_: OK, available

**Short**:
At least one product the scenario needs cannot be allocated in full.
_Avoid_: Out of stock, missing

**Unknown**:
Readiness cannot be determined because a fact is missing, such as a nominated solution, a product requirement or a stock record. Never treated as Ready.
_Avoid_: Pending, N/A

**Shortage**:
The amount of a product that planned work needs but cannot be allocated.
_Avoid_: Stock-out, gap

## Escalation

**Escalation**:
A team leader's request to a project manager to resolve a shortage. It is **Open** until resolved.
_Avoid_: Ticket, request, issue

**Resolution**:
How a project manager closed an escalation: stock arriving, a different solution being nominated, or the planned work being rescheduled.
_Avoid_: Outcome, closure

## Reserved terms

**Variation**:
An installation that falls outside the nominated solution's specification. Never use it for a substitution.
_Avoid_: Using "variation" to mean a candidate solution
