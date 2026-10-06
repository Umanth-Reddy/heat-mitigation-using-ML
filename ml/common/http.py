import json
import os
import time

import requests


def get_json_cached(url: str, params: dict, cache_path: str, retries: int = 5, refresh: bool = False) -> dict:
    """GET with retries and exponential back-off; the response is cached on disk as JSON."""
    if os.path.exists(cache_path) and not refresh:
        with open(cache_path, encoding="utf-8") as f:
            return json.load(f)
    last = None
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=120)
            if r.status_code == 200:
                data = r.json()
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(data, f)
                return data
            last = f"HTTP {r.status_code}: {r.text[:200]}"
            if r.status_code == 400:
                break  # bad request: retrying will not help
        except requests.RequestException as e:
            last = str(e)
        time.sleep(2 ** attempt)
    raise RuntimeError(f"Failed to fetch {url} {params}: {last}")
