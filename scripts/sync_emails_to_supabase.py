#!/usr/bin/env python3
import os, json
import pickle
import base64
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_date
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from supabase import create_client, Client
import re
import hashlib

# Gmail API scope
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

from dotenv import load_dotenv
load_dotenv()
# Supabase configuration - set these environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')  # e.g., "https://your-project.supabase.co"
SUPABASE_KEY = os.getenv('SUPABASE_KEY')  # Your anon/public key

def get_credentials():
    """Get Gmail API credentials"""
    creds = None
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

def get_existing_links(supabase: Client):
    """Get all existing links from Supabase to avoid duplicates"""
    existing_links = set()
    
    # Fetch all links (you may want to paginate for very large datasets)
    response = supabase.table('links').select('link, title').execute()
    
    for item in response.data:
        link = item.get('link', '').strip()
        if link:
            existing_links.add(link.lower())
    
    print(f"Found {len(existing_links)} existing links in Supabase")
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
            maxResults=500,
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
            'gmail_id': email_id,
        }
        
    except Exception as e:
        print(f"Error processing email {email_id}: {e}")
        return None

def sync_emails_to_supabase(days_back=7):
    """Main sync function"""
    # Check environment variables
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Please set SUPABASE_URL and SUPABASE_KEY environment variables")
        return
    
    print(f"Using Supabase URL: {SUPABASE_URL}")
    print(f"Using API key starting with: {SUPABASE_KEY[:20]}...")
    
    # Initialize Gmail API
    print("Connecting to Gmail...")
    creds = get_credentials()
    service = build('gmail', 'v1', credentials=creds)
    
    # Initialize Supabase
    print("Connecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Get existing links
    existing_links = get_existing_links(supabase)
    
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
                # Parse date for Supabase
                ogdate = None
                if email_data['date']:
                    ogdate = parse_date(email_data['date']).isoformat()
                
                # Add to Supabase
                result = supabase.table('links').insert({
                    'title': email_data['subject'],
                    'link': email_data['link'],
                    'ogdate': ogdate,
                    'gmail_id': email_data['gmail_id'],
                }).execute()
                
                # Add to existing links set to avoid duplicates in this run
                existing_links.add(link_lower)
                
                added_count += 1
                print(f"Added: {email_data['subject'][:50]}...")
                
            except Exception as e:
                print(f"Error adding to Supabase: {e}")
    
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
            print("Usage: python sync_emails_to_supabase.py [days_back]")
            print("Example: python sync_emails_to_supabase.py 30")
            sys.exit(1)
    
    sync_emails_to_supabase(days_back)