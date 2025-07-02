#!/usr/bin/env python3
import requests
import json
from datetime import datetime

# PocketBase API endpoint
BASE_URL = "https://pb.voidterminal.app"

def test_public_api():
    """Test fetching records from PocketBase with authentication"""
    print("Testing PocketBase API...")
    
    # First authenticate
    auth_url = f"{BASE_URL}/api/collections/_superusers/auth-with-password"
    auth_data = {
        "identity": "shubhamchandel@nyu.edu",
        "password": "thisisasafepassword"
    }
    
    try:
        auth_response = requests.post(auth_url, json=auth_data)
        auth_response.raise_for_status()
        auth_result = auth_response.json()
        token = auth_result.get('token')
        print(f"Authenticated successfully")
        
        # Now fetch records with auth token
        url = f"{BASE_URL}/api/collections/links/records"
        params = {
            "perPage": 10,
            "sort": "-created",  # Try sorting by created date
            # Remove fields parameter to get all fields
        }
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        print(f"\nTotal records: {data.get('totalItems', 0)}")
        print(f"Retrieved: {len(data.get('items', []))} records")
        print("\nSample records:")
        print("-" * 80)
        
        # First, let's see all available fields
        if data.get('items'):
            print(f"\nAvailable fields: {list(data['items'][0].keys())}")
        
        for i, item in enumerate(data.get('items', [])[:5], 1):
            print(f"\n{i}. Title: {item.get('title', 'No title')}")
            print(f"   Link: {item.get('link', 'No link')}")
            print(f"   Date: {item.get('ogdate', item.get('created', 'No date'))}")
            print(f"   ID: {item.get('id')}")
        
        # Test search functionality
        print("\n" + "="*80)
        print("\nTesting search with filter...")
        search_params = {
            "perPage": 5,
            "filter": "(title ~ 'machine learning' || title ~ 'ML' || title ~ 'AI')"
        }
        
        search_response = requests.get(url, params=search_params, headers=headers)
        search_response.raise_for_status()
        search_data = search_response.json()
        
        print(f"Found {search_data.get('totalItems', 0)} ML/AI related records")
        for item in search_data.get('items', [])[:3]:
            print(f"- {item.get('title', 'No title')[:80]}...")
            
    except requests.exceptions.RequestException as e:
        print(f"Error accessing PocketBase API: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON response: {e}")

def test_cors_headers():
    """Test CORS headers for frontend access"""
    print("\n" + "="*80)
    print("\nTesting CORS headers...")
    
    url = f"{BASE_URL}/api/collections/links/records"
    response = requests.options(url)
    
    cors_headers = {
        'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin', 'Not set'),
        'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods', 'Not set'),
        'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers', 'Not set')
    }
    
    print("CORS Headers:")
    for header, value in cors_headers.items():
        print(f"  {header}: {value}")

if __name__ == "__main__":
    test_public_api()
    test_cors_headers()