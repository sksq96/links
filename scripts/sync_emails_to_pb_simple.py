#!/usr/bin/env python3
import os, json
import pickle
import base64
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from pb import PocketBaseClient
import re
import hashlib

# Gmail API scope
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_credentials():
    """Get Gmail API credentials"""
    creds = None
    # Use paths relative to project root
    token_path = os.path.join(os.path.dirname(__file__), '..', 'token.pickle')
    creds_path = os.path.join(os.path.dirname(__file__), '..', 'credentials.json')
    
    if os.path.exists(token_path):
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
    return creds

def get_existing_links(pb_client):
    """Get all existing links from PocketBase to avoid duplicates"""
    existing_links = set()
    page = 1
    
    # Import requests after auth
    import requests
    
    while True:
        params = {
            "page": page,
            "perPage": 500,
            "fields": "link,title"  # Only fetch link and title fields
        }
        
        url = f"{pb_client.base_url}/api/collections/links/records"
        headers = {"Authorization": f"Bearer {pb_client.token}"}
        
        resp = requests.get(url, params=params, headers=headers)
        data = resp.json()
        
        for item in data.get('items', []):
            # Create a unique key from link + title
            link = item.get('link', '').strip()
            title = item.get('title', '').strip()
            if link:
                # Use just the link as the unique identifier
                # This prevents duplicate links even if titles differ slightly
                existing_links.add(link.lower())
        
        if page >= data.get('totalPages', 1):
            break
        page += 1
    
    print(f"Found {len(existing_links)} existing links in PocketBase")
    return existing_links

def extract_link_from_body(message_body):
    """Extract and clean link from email body"""
    # Remove common signatures
    link = message_body.strip()\
        .replace('Thanks,\r\nShubham', '')\
        .replace("Thanks and regards,\r\nShubham Chandel", "")\
        .replace("Thanks and Regards,\r\n\r\nShubham Chandel\r\nNew York University", "")\
        .replace("-- \r\nThis message (including any attachments) contains confidential information \r\nintended for a specific individual and purpose, and is protected by law. If \r\nyou are not the intended recipient, you should delete this message and are \r\nhereby notified that any disclosure, copying, or distribution of this \r\nmessage, or the taking of any action based on it, is strictly prohibited.", "")
    
    # Clean up link formatting
    link = link.replace("<", "").replace(">", "").replace("\r\n", " ").strip()
    
    # Try to extract just the URL if there's extra text
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+(?:[/?#][^\s<>"{}|\\^`\[\]]*)?'
    urls = re.findall(url_pattern, link)
    if urls:
        return urls[0]  # Return the first URL found
    
    return link

def get_recent_emails(service, labels, days_back=7):
    """Get emails from the last N days"""
    emails = []
    
    # Create a query for emails from the last N days
    date_after = (datetime.now() - timedelta(days=days_back)).strftime('%Y/%m/%d')
    query = f'after:{date_after}'
    
    for label in labels:
        # Get recent emails
        results = service.users().messages().list(
            userId='me', 
            labelIds=[label], 
            maxResults=500,  # Increased from 100
            q=query
        ).execute()
        
        messages = results.get('messages', [])
        emails.extend(messages)
        
        # Handle pagination for more results
        while 'nextPageToken' in results:
            page_token = results['nextPageToken']
            results = service.users().messages().list(
                userId='me',
                labelIds=[label],
                pageToken=page_token,
                maxResults=500,
                q=query
            ).execute()
            messages = results.get('messages', [])
            emails.extend(messages)
        
        print(f"Found {len(emails)} emails from last {days_back} days in {label}")
    
    return emails

def process_email(service, email_id):
    """Process a single email and extract relevant information"""
    try:
        msg = service.users().messages().get(userId='me', id=email_id).execute()
        payload = msg['payload']
        headers = payload['headers']
        
        # Extract headers
        subject = ''
        sender = ''
        date = ''
        
        for header in headers:
            if header['name'] == 'Subject':
                subject = header['value']
            elif header['name'] == 'From':
                sender = header['value']
            elif header['name'] == 'Date':
                date = header['value']
        
        # Extract body
        message_body = ""
        try:
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        message_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
            else:
                if payload.get('body', {}).get('data'):
                    message_body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        except Exception as e:
            print(f"Error decoding email body: {e}")
            return None
        
        # Skip if no body or it's a system message
        if not message_body or "intended for a specific individual and purpose" in message_body:
            return None
        
        # Extract link
        link = extract_link_from_body(message_body)
        
        # Skip if link is too long or empty
        if not link or len(link.split()) > 5 or len(link) > 500:
            return None
        
        return {
            'subject': subject,
            'sender': sender,
            'date': date,
            'link': link,
        }
        
    except Exception as e:
        print(f"Error processing email {email_id}: {e}")
        return None

def sync_emails_to_pocketbase(days_back=7):
    """Main sync function"""
    # Initialize Gmail API
    print("Connecting to Gmail...")
    creds = get_credentials()
    service = build('gmail', 'v1', credentials=creds)
    
    # Initialize PocketBase
    print("Connecting to PocketBase...")
    pb_client = PocketBaseClient('https://pb.voidterminal.app')
    
    # Authenticate with PocketBase
    if not pb_client.auth('_superusers', 'shubhamchandel@nyu.edu', 'thisisasafepassword'):
        print("Failed to authenticate with PocketBase")
        return
    
    # Get existing links
    existing_links = get_existing_links(pb_client)
    
    # Get recent emails
    print(f"Fetching emails from last {days_back} days...")
    labels = ['INBOX']
    recent_emails = get_recent_emails(service, labels, days_back)
    
    if not recent_emails:
        print("No emails found in the specified time range")
        return
    
    print(f"Processing {len(recent_emails)} emails...")
    
    # Process emails and add new ones
    added_count = 0
    skipped_count = 0
    
    for i, email in enumerate(recent_emails):
        if i % 50 == 0:
            print(f"Progress: {i}/{len(recent_emails)}")
            
        email_data = process_email(service, email['id'])
        
        if email_data:
            # Check if link already exists
            link_lower = email_data['link'].lower()
            if link_lower in existing_links:
                print(f"Skipping {email_data['subject'][:50]}...")
                skipped_count += 1
                continue
            
            try:
                # Parse date for PocketBase
                ogdate = None
                if email_data['date']:
                    ogdate = parse_date(email_data['date'])
                
                # Add to PocketBase
                pb_client.add_row('links', {
                    'title': email_data['subject'],
                    'link': email_data['link'],
                    'ogdate': ogdate,
                })
                
                # Add to existing links set to avoid duplicates in this run
                existing_links.add(link_lower)
                
                added_count += 1
                print(f"Added: {email_data['subject'][:50]}...")
                
            except Exception as e:
                print(f"Error adding to PocketBase: {e}")
    
    print(f"\nSync complete!")
    print(f"Added: {added_count} new links")
    print(f"Skipped: {skipped_count} duplicate links")

if __name__ == '__main__':
    import sys
    
    # Allow specifying days back as command line argument
    days_back = 7
    if len(sys.argv) > 1:
        try:
            days_back = int(sys.argv[1])
        except:
            print("Usage: python sync_emails_to_pb_simple.py [days_back]")
            print("Example: python sync_emails_to_pb_simple.py 30")
            sys.exit(1)
    
    sync_emails_to_pocketbase(days_back)