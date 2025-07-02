import requests
from loguru import logger as _logging
from datetime import date, datetime
import pandas as pd

class PocketBaseClient:
    """
    A simple one-file PocketBase client for auth and adding rows.
    """
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.token = None

    def auth(self, collection: str, identity: str, password: str) -> bool:
        """
        Authenticate against a collection (e.g., 'users' or '_superusers').
        Returns True on success, False on failure.
        """
        url = f"{self.base_url}/api/collections/{collection}/auth-with-password"
        payload = {"identity": identity, "password": password}
        try:
            resp = requests.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            self.token = data.get('token')
            _logging.info(f"Authenticated to {collection} as {identity}")
            return True
        except requests.HTTPError as e:
            _logging.error(f"Auth failed: {e} - {resp.text}")
            return False

    def add_row(self, collection: str, row_data: dict) -> dict:
        """
        Add a new row (record) to the specified collection.
        Automatically formats datetime/date objects to ISO 8601 strings.
        Returns the created record JSON on success.
        """
        if not self.token:
            raise RuntimeError("Not authenticated. Call auth() first.")

        # Convert date/time objects
        formatted_data = {}
        for key, value in row_data.items():
            if isinstance(value, (datetime, date)):
                # convert to RFC3339 / ISO8601 string
                # datetime.isoformat() includes timezone if aware; add 'Z' for UTC
                iso = value.isoformat()
                if isinstance(value, datetime) and value.utcoffset() is None:
                    iso += 'Z'
                formatted_data[key] = iso
            else:
                formatted_data[key] = value
        
        url = f"{self.base_url}/api/collections/{collection}/records"
        headers = {"Authorization": f"Bearer {self.token}"}
        try:
            resp = requests.post(url, json=formatted_data, headers=headers)
            resp.raise_for_status()
            record = resp.json()
            _logging.info(f"Added row to {collection}: {record}")
            return record
        except requests.HTTPError as e:
            _logging.error(f"Failed to add row: {e} - {resp.text}")
            raise

    def delete_all_rows(self, collection: str):
        """Delete all rows from a collection by fetching and deleting them individually."""
        if not self.token:
            raise RuntimeError("Not authenticated. Call auth() first.")
        
        headers = {"Authorization": f"Bearer {self.token}"}
        deleted_count = 0
        
        # Keep fetching and deleting until no more records
        while True:
            # Fetch a batch of records
            list_url = f"{self.base_url}/api/collections/{collection}/records"
            params = {"perPage": 500}  # Max allowed per page
            
            try:
                resp = requests.get(list_url, headers=headers, params=params)
                resp.raise_for_status()
                data = resp.json()
                
                if not data.get('items'):
                    break  # No more records
                
                # Delete each record
                for item in data['items']:
                    delete_url = f"{self.base_url}/api/collections/{collection}/records/{item['id']}"
                    del_resp = requests.delete(delete_url, headers=headers)
                    del_resp.raise_for_status()
                    deleted_count += 1
                    
                _logging.info(f"Deleted {deleted_count} records so far...")
                
                # If we got fewer items than requested, we're done
                if len(data['items']) < params['perPage']:
                    break
                    
            except requests.HTTPError as e:
                _logging.error(f"Failed during deletion: {e}")
                raise
        
        _logging.info(f"Deleted {deleted_count} total records from {collection}")
        return {"deleted": deleted_count}

# Example usage:
if __name__ == '__main__':
    from datetime import datetime
    df = pd.read_json("../links.jsonl", lines=True)
    client = PocketBaseClient('https://pb.voidterminal.app')
    if client.auth('_superusers', 'shubhamchandel@nyu.edu', 'thisisasafepassword'):
        # client.delete_all_rows('links')
        for index, row in df.iterrows():
            from dateutil.parser import parse
            if len(row['link'].split()) > 5:
                continue
            # Generate a fake gmail_id for old data
            gmail_id = f"jsonl_{index}"
            new = client.add_row('links', {
                'ogdate': parse(row['date']), 
                'link': row['link'], 
                'title': row['subject'],
                'gmail_id': gmail_id
            })
            # break
