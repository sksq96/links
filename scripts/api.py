import os
import modal

def docker_image():
    return (
        modal.Image.debian_slim()
        .pip_install("pandas", "numpy", "cohere", "openai")
    )

app = modal.App("search-app")

cohere_secret = modal.Secret.from_name("cohere-api-key")
openai_secret = modal.Secret.from_name("my-openai-secret")
volume = modal.Volume.from_name("embeddings")

@app.cls(
    image=docker_image(),
    secrets=[cohere_secret, openai_secret],
    cpu=1,  # Request 1 CPU core
    memory=1024,  # Request 1 GB of memory
    volumes={"/data": volume},
    container_idle_timeout=300,
    # keep_warm=1
)
class SearchApp:
    @modal.enter()
    def initialize(self):
        import pandas as pd
        import numpy as np
        import cohere
        from openai import OpenAI

        self.pd = pd
        self.np = np
        self.co = cohere.Client(api_key=os.environ["cohere"])
        self.client = OpenAI()
        # list all files in the volume
        print(os.listdir("/data/data"))
        self.df = self.pd.read_pickle("/data/data/df.embedding")
        print("# of embeddings: ", self.df.shape)
        self.embeddings = self.df['embeddings'].tolist()

    def cosine_similarity(self, arr, matrix):
        arr_norm = arr / self.np.linalg.norm(arr)
        matrix_norm = matrix / self.np.linalg.norm(matrix, axis=1, keepdims=True)
        similarity = self.np.dot(matrix_norm, arr_norm)
        return similarity

    @modal.web_endpoint(method="GET")
    def search(self, term: str):
        if not term:
            df = self.df[['link', 'subject', 'date']]
            df.columns = ['url', 'title', 'date']
            return df.to_dict(orient='records')
        # query_emb = self.co.embed(texts=[term], model="embed-english-v3.0", input_type="search_query").embeddings[0]
        query_emb = self.client.embeddings.create(input=[term], model="text-embedding-3-large").data[0].embedding
        similarity = self.cosine_similarity(query_emb, self.embeddings)
        # Replace argpartition with argsort for full sorting
        top_indices = self.np.argsort(similarity)[::-1]
        sdf = self.df.iloc[top_indices][['link', 'subject', 'date']]
        sdf.columns = ['url', 'title', 'date']
        matching_links = sdf.to_dict(orient='records')
        return matching_links

if __name__ == "__main__":
    modal.serve(app)