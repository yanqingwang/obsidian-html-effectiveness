# Test Note for HTML Effectiveness

This is a test note to verify all html-effect template types.

## Compare

```html-effect
compare

# Approach 1: Simple
This is the **first** approach with `inline code`.
```js
const x = 1;
```
| Pro | Con |
| Easy to use | Limited features |
| Fast | No scalability |

### Metrics
Minimal +0 kb

---tag: Approach 2
# Approach 2: Advanced
This approach has *more features* but is **complex**.
```ts
const y = await fetch(url);
```
| Pro | Con |
| Full featured | Steep learning curve |
| Scalable | More code |

### Metrics
Full +12 kb

## Recommendation
Use **Approach 1** for simple cases, **Approach 2** when you need scale.
```

## Timeline

```html-effect
timeline

- [2026-01-15] Project **kickoff** meeting
- [2026-02-01] Alpha release [sev:high]
- [2026-03-15] Beta release with `fixes` [sev:med]
- [2026-04-01] Public launch 🎉 [sev:low]
```

## Diagram

```html-effect
diagram

[Start]
(Ping Server)
{Success?}
  |
  v
[Process Data]
  ->
(End)
```

## Report

```html-effect
---
type: report
---
## KPI
- 14: PRs merged (delta: +3)
- 6: Deploys (delta: ±0)
- 2: Incidents (delta: -1)

# Highlights
- **Big launch**: Shipped v2.0 with new **auth** system
- **Bug fix**: Resolved connection `timeout` issue

# Shipped
| PR | Title | Author | Risk |
|4871|Fix login|Alice|low|
|4872|Add cache|Bob|med|
|4873|New API|Carol|high|

# Velocity
Mon:0,Tue:2,Wed:3,Thu:5,Fri:4

# Carryover
- [in-review] Workspace export — waiting on review (Alice)
- [blocked] SSO mapping — blocked on IdP credentials
- [slipped] Push reliability — deprioritized
```

## Slides

```html-effect
slides

# Welcome
Intro slide with **bold** and `code`

---
# Features
- Feature one
- Feature two **important**
- Feature three

---
# Metrics
Revenue: **$2.5M**
Users: **84K**
Speed: **180ms**
```
