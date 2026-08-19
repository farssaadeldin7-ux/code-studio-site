# Code Studio — Plugin Portfolio

A catalog of 14 plugin concepts, each matched to the professional audience with the
most pain (time-loss or revenue-loss) and the budget to solve it. Every plugin directory
contains a `README.md` (overview, audience, required skill, monetization, roadmap) and a
`plugin.json` manifest.

## Flagship plugins

Vertical tools with the clearest immediate ROI.

| Plugin | Category | Target audience | Skill required |
|---|---|---|---|
| [Diagnose by Sound](diagnose-by-sound/) | Mechanical | Professional mechanics, repair shops, and DIY enthusiasts. | Baseline mechanical literacy |
| [Ghost Post Preview](ghost-post-preview/) | Social Media | Creators, social media managers, and businesses running paid or organic content. | Audience definition |
| [Professor Mind-Reader](professor-mind-reader/) | Academic | Students aiming for top grades; professionals in certification or graded-assessment programs. | Rubric sourcing |
| [5-Minute Fluency](five-minute-fluency/) | Gaming | Competitive gamers and ranked-ladder players. | Session tagging |
| [Basecamp Split](basecamp-split/) | Bushcraft | Professional outdoor guides, expedition leaders, and organized trip groups. | Trip templating |

## Professional plugins

Matched to professional audiences and the skill each audience must master to leverage the tool.

| Plugin | Category | Target audience | Skill required |
|---|---|---|---|
| [Podcast/Video Studio](podcast-video-studio/) | Content Production | Content agencies and solo creators. | Content Strategy |
| [AI-Powered Customer Support Agent](customer-support-agent/) | Customer Support | E-commerce managers and SaaS founders. | Knowledge Base Architecture |
| [Sales Enablement Assistant](sales-enablement-assistant/) | Sales | B2B sales teams and account executives. | Prospecting Psychology |
| [Mental-Health Chatbot](mental-health-chatbot/) | Health & Wellness | Telehealth platforms and HR wellness departments. | Clinical Triage Protocols |
| [Neural-Link Intention Layer](neural-link-intention-layer/) | Creative Tools | Professional digital artists and UI/UX designers. | Advanced Workflow Optimization |
| [Generative Digital Twin Collaborator](digital-twin-collaborator/) | Creative Tools | Freelance creative directors and studio heads. | Style Governance |
| [Real-Time Emotional Resonance Analyzer](emotional-resonance-analyzer/) | Video Editing | Professional video editors and documentary filmmakers. | Narrative Pacing Theory |
| [Code-to-Visual Interpreter](code-to-visual-interpreter/) | Creative Development | Creative technologists and web developers. | Computational Design |
| [Predictive Resource Allocation Engine](resource-allocation-engine/) | Infrastructure | 3D animators, VFX artists, and data scientists. | System Architecture Literacy |

## Structure

```
plugins/
  <plugin-slug>/
    README.md      # overview, audience, pain, skill, monetization, roadmap
    plugin.json    # manifest (name, version, category, status)
```

All plugins are currently at `status: concept` — the manifests and roadmaps define the build
order as each moves to implementation.
