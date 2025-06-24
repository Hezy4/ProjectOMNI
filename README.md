Project OMNI: Pathfinding & Analysis Engine
Core Features

    Targeted Search & Data Structuring
        Leverages advanced search filters such as:
            Industry
            Geographic Region
            Company Size
        Gathers essential identification data (e.g., name, current employer).
        Enriches initial data through detailed, one-by-one profile lookups to acquire information on:
            Undergraduate & Graduate Education
            Recent Employment History (last 3 positions)
            Professional Group Affiliations

    Local CSV Storage
        Compiles the complete, enriched dataset into a clean CSV format.
        Enables easy local saving and data portability.

    Advanced Scoring & Pathfinding
        Assigns a quantitative score to each individual profile based on a proprietary weighting system.
        Calculates the optimal X number of paths between a designated start and target node within the dataset.
        Presents the final results through a clean, modern, and minimalist user interface.

    Note: The initial data collection from professional networking sites is handled by a separate, private browser extension. This engine is designed to process and analyze the data provided by that tool.

Technical Roadmap
1. Data Collection & Enrichment Logic

(Handled by the private data acquisition tool)

    Navigate to each profile within a search result.
    Perform automated scrolling and section expansion to reveal and extract key data points.
    Capture detailed educational and employment history.
    Catalog and structure the following:
        Top 3 most recent companies by tenure.
        Complete employment history.
        Group and association memberships.
    Incorporate a Notes field to capture profile bio text for subsequent AI analysis.
    Append all structured information—education, past companies, etc.—to the primary CSV dataset.
    Systematically mark profiles as "completed" and iterate through the entire list.

2. Data Processing & Pathfinding Algorithm

(Core logic of this engine)

    Normalize and clean the entire collected dataset for consistency.
    Process each profile through a local or cloud-based AI model to compute a weight score (lower is better), considering factors such as:
        Company History & Prestige
        Educational Background
        Industry Alignment
        Network Proximity to Target
        Keywords and Sentiment in Bio
        Relevance of Professional Memberships
    Construct a weighted graph data structure from the scored profiles.
    Execute a pathfinding algorithm to identify the lowest-weighted paths, applying a penalty for each additional "hop" to prioritize shorter connection chains.
    Display the top X (a user-configurable number) optimal paths in the frontend UI for review and analysis.

Technical & Operational Notes

    Performance Target: The system is designed to process at reasonable rate (currently untested)
    User Experience: The entire analysis workflow is managed through the UI, with no visible browser automation windows.
    Compliance: The data acquisition methodology is designed around a user-consent model to ensure responsible and compliant data handling.
