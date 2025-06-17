# Henry Boes – Lyons Project – Internal Use Only.

# Build a weighted relationship graph & find top-K introduction paths.

import sys, re, logging
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt
from itertools import islice

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s %(levelname)s %(message)s')

# ------------------------------------------------------------------------
#                           helpers
# ------------------------------------------------------------------------
BAD_TOKENS = {'', 'nan', 'none', 'null', '<na>'}

def clean(v) -> str:
    """Return a trimmed string or '' for any NA/blank/‘nan’ values."""
    if pd.isna(v):
        return ''
    s = str(v).strip()
    return '' if s.lower() in BAD_TOKENS else s


def load_data(path: str) -> pd.DataFrame:
    logging.info(f"Loading data from {path}")
    df = (pd.read_csv(path, encoding='utf-8-sig')
            .dropna(how='all')
            .dropna(axis=1, how='all'))
    df.columns = (df.columns
                    .str.encode('utf-8').str.decode('utf-8', 'ignore')
                    .str.strip()
                    .str.replace(r'\s+', ' ', regex=True)
                    .str.title())

    logging.info(f"Columns detected: {list(df.columns)}")

    aliases = {'Person Name':'Name', 'Full Name':'Name', '\ufeffName':'Name',
               'Company':'Employer'}
    df.rename(columns={k:v for k,v in aliases.items() if k in df.columns},
              inplace=True)

    if 'Name' not in df.columns:
        raise ValueError("❌ Required column 'Name' missing.")
    return df


def find_k_shortest_paths(G, src, tgt, k=10):
    try:
        paths = nx.shortest_simple_paths(G, src, tgt, weight='weight')
        return list(islice(paths, k))
    except (nx.NetworkXNoPath, nx.NodeNotFound):
        return []


# ------------------------------------------------------------------------
#                           graph builder
# ------------------------------------------------------------------------
def build_graph(df: pd.DataFrame, source_name: str) -> nx.Graph:
    """
    Build graph.  Extra rule:
        if ConnectedTo is populated ->
            1) add edge (row-person ↔ ConnectedTo)   [first_degree]
            2) add edge (row-person ↔ SOURCE)        [second_degree_to_source]
    """
    df = df.copy()
    df.columns = (df.columns.str.strip()
                              .str.lower()
                              .str.replace(r'[\s_]+', '', regex=True))

    def col(prefix: str):
        return next((c for c in df.columns if c.startswith(prefix)), None)

    G = nx.Graph()

    # ------------ nodes -------------
    for _, row in df.iterrows():
        person = clean(row[col('name')])
        if not person:
            continue
        G.add_node(person, type='person', title=clean(row.get(col('title'))))

        emp = clean(row.get(col('employer')))
        if emp:
            G.add_node(emp, type='company')

        for i in range(1, 6):
            pc = clean(row.get(col(f'pastcompany{i}')))
            if pc:
                G.add_node(pc, type='company')

        for key in ('undergradschool', 'gradschool', 'degree3school'):
            school = clean(row.get(col(key)))
            if school:
                G.add_node(school, type='college')

    # make sure SOURCE exists
    G.add_node(source_name, type='person')

    # regex splitter for multi-entry cells
    splitter = re.compile(r'\s*(?:;|,|/|&|\band\b)\s*', flags=re.I)

    # ------------ edges -------------
    for _, row in df.iterrows():
        p = clean(row[col('name')])
        if not p:
            continue

        emp = clean(row.get(col('employer')))
        if emp:
            G.add_edge(p, emp, relationship='current_employment', weight=0.85)

        for i in range(1, 6):
            pc = clean(row.get(col(f'pastcompany{i}')))
            if pc:
                G.add_edge(p, pc, relationship='past_employment', weight=0.55)

        for key in ('undergradschool', 'gradschool', 'degree3school'):
            school = clean(row.get(col(key)))
            if school:
                G.add_edge(p, school, relationship='alumni', weight=0.65)

        # ---------- NEW logic ----------
        raw_conn = row.get(col('connectedto'))
        if not pd.isna(raw_conn):
            for tgt in splitter.split(str(raw_conn)):
                tgt = clean(tgt)
                if not tgt or tgt == p:
                    continue
                if not G.has_node(tgt):
                    G.add_node(tgt, type='person')

                # edge 1 – person ↔ ConnectedTo
                G.add_edge(p, tgt,
                           relationship='first_degree',
                           weight=1.00)

                # edge 2 – person ↔ SOURCE
                if p != source_name:
                    G.add_edge(p, source_name,
                               relationship='second_degree_to_source',
                               weight=0.90)
        # ---------- END NEW ------------

    # remove any ‘nan’/blank nodes that slipped through
    for bogus in BAD_TOKENS:
        if G.has_node(bogus):
            G.remove_node(bogus)

    return G


# ------------------------------------------------------------------------
#                         main program
# ------------------------------------------------------------------------
def main():
    if len(sys.argv) < 4:
        print("Usage: python relationship_graph.py <csv> <source_name> <target_name> [K]")
        sys.exit(1)

    csv_path   = sys.argv[1]
    source     = sys.argv[2]
    target     = sys.argv[3]
    k          = int(sys.argv[4]) if len(sys.argv) > 4 else 10

    df = load_data(csv_path)
    G  = build_graph(df, source)

    print("→ Total nodes:", G.number_of_nodes())
    print("→ Total edges:", G.number_of_edges())

    paths = find_k_shortest_paths(G, source, target, k)
    if not paths:
        print(f"No connection paths found from {source} to {target}.")
    else:
        print(f"Top {len(paths)} paths from {source} to {target}:")
        for i, path in enumerate(paths, 1):
            score = nx.path_weight(G, path, weight='weight')
            print(f"  Path {i} (score={score:.2f}): {path}")

    # quick graph visual (unchanged)
    plt.figure(figsize=(12, 10))
    pos = nx.spring_layout(G, k=0.5, seed=42)
    palette = {'person':'lightblue','company':'lightgreen','college':'orange','group':'pink'}
    colors = [palette.get(G.nodes[n].get('type','person'),'lightgray') for n in G]
    nx.draw(G, pos, with_labels=True, node_color=colors,
            node_size=500, font_size=8, edge_color='gray')
    edge_labels = {(u,v):f"{d['weight']:.2f}" for u,v,d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_color='red')
    plt.title("Weighted Relationship Graph")
    plt.show()


if __name__ == "__main__":
    main()
