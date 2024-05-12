from modal import App, web_endpoint

app = App()  # Note: prior to April 2024, "app" was called "stub"

@app.function()
@web_endpoint()
def square(x: int):
    return {"square": x**2}