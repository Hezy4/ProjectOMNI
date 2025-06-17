# Lyons Product

## Features

- **LinkedIn Navigator Search**  
  - Industry  
  - Region  
  - Company size  

- **Sales Navigator Data Collection**  
  1. Collect basic identification:  
     - Name  
     - Employer  
  2. Enrichment (one-by-one profile lookup):  
     - Undergrad  
     - Grad school  
     - Past 3 companies  
     - Groups/memberships  

- **CSV Storage**  
  - Gather enriched dataset in CSV format  
  - Save locally  

- **Scoring & Pathfinding**  
  1. Weight each person by a score  
  2. Find the best **X** paths from start node to target node  
  3. Display results on a modern, minimalist UI  

---

## Roadmap

### 1. Data Collection Algorithm  
1. Click on the name of each node  
2. In the side panel, scroll down and back up  
3. Expand sections to extract:  
   - Education & past employment  
4. Catalog:  
   - Best 3 companies (by attendance time)  
   - Full employment history  
   - Groups/memberships  
5. Add a **Notes** section to capture LinkedIn bio for AI processing  
6. Append all information to CSV:  
   - Education  
   - Past companies  
7. Mark node as completed and continue to the next node  

### 2. Data Processing Algorithm  
1. Normalize all collected data  
2. Run each node through a local (or cloud-based) AI model to compute a weight score (lower = better):  
   - Company history  
   - Education history  
   - Industry alignment  
   - Closeness to target  
   - Bio contents  
   - LinkedIn memberships/groups  
3. Build a graph with nodes and weighted connections  
4. Find the lowest-weighted path (apply a penalty per extra hop to favor shorter chains)  
5. Present the top **X** options (user-configurable) in the frontend UI  

---

## Notes

- Prefer a local AI model, but cloud services are acceptable if needed  
- Target performance: ≤ 5 minutes per 1,000 profiles  
- Entire workflow via the UI (no visible browser windows)  
- Filters applied in the background on Sales Navigator  
- Operate without an active Chrome tab in the foreground  
- Implement a user-consent model to ensure compliance with scraping laws  
