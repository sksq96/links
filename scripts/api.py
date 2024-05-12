import uuid
import pandas as pd
import numpy as np


from flask import Flask, request, jsonify
# from flask_cors import CORS
# app = Flask(__name__)
# CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

import cohere
co = cohere.Client("xDp0VXO6GeYZp9DxDcP0oncnHNtNALyHxeeZmYE9")

def cosine_similarity(arr, matrix, k=10):
    arr_norm = arr / np.linalg.norm(arr)
    matrix_norm = matrix / np.linalg.norm(matrix, axis=1, keepdims=True)
    similarity = np.dot(matrix_norm, arr_norm)
    top_k_indices = np.argpartition(-similarity, k)[:k]
    return top_k_indices

df = pd.read_pickle("df.embedding")
embeddings = df['embeddings'].tolist()


app = Flask(__name__)

@app.route('/api/search', methods=['GET'])
def search_links():
    query = request.args.get('term', '')
    query_emb = co.embed(texts=[query], model="embed-english-v3.0", input_type="search_query").embeddings[0]
    top_indices = cosine_similarity(query_emb, embeddings)
    sdf = df.iloc[top_indices][['link', 'subject']]
    sdf.columns = ['url', 'title']
    matching_links = sdf.to_dict(orient='records')
    return jsonify(matching_links)

if __name__ == '__main__':
    app.run(debug=True)

