import streamlit as st
import pandas as pd
import networkx as nx
import matplotlib.pyplot as plt

from relationship_graph import load_data, build_graph, find_k_shortest_paths

st.set_page_config(page_title="Relationship Graph", layout="wide")

st.title("Investor Connection")

uploaded_file = st.file_uploader("Upload CSV", type="csv")
source_name = st.text_input("Source person name")
target_name = st.text_input("Target person name")

k = st.number_input("Number of paths to show", min_value=1, max_value=50, value=5, step=1)

if uploaded_file is not None and source_name and target_name:
    df = load_data(uploaded_file)
    G = build_graph(df, source_name)

    st.subheader("Graph Summary")
    st.write(f"Total nodes: {G.number_of_nodes()}")
    st.write(f"Total edges: {G.number_of_edges()}")

    paths = find_k_shortest_paths(G, source_name, target_name, k)

    if paths:
        st.subheader("Recommended Connection Paths")
        for i, path in enumerate(paths, 1):
            score = nx.path_weight(G, path, weight='weight')
            st.write(f"Path {i} (score={score:.2f}): {' -> '.join(path)}")
    else:
        st.warning("No connection paths found.")

    # draw graph
    fig, ax = plt.subplots(figsize=(12, 10))
    pos = nx.spring_layout(G, k=0.5, seed=42)
    palette = {'person': 'lightblue', 'company': 'lightgreen', 'college': 'orange', 'group': 'pink'}
    colors = [palette.get(G.nodes[n].get('type', 'person'), 'lightgray') for n in G]
    nx.draw(G, pos, with_labels=True, node_color=colors, node_size=500,
            font_size=8, edge_color='gray', ax=ax)
    edge_labels = {(u, v): f"{d['weight']:.2f}" for u, v, d in G.edges(data=True)}
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_color='red', ax=ax)
    st.pyplot(fig)
else:
    st.info("Please upload a CSV and enter both source and target names to generate the graph.")