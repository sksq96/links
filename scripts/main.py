import os, json
import pickle
import base64
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
import pandas as pd
from datetime import datetime

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']

def get_credentials():
    creds = None
    if os.path.exists('token.pickle'):
        with open('token.pickle', 'rb') as token:
            creds = pickle.load(token)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
        with open('token.pickle', 'wb') as token:
            pickle.dump(creds, token)
    return creds

def get_emails(service, labels, latest_date):
    emails = []
    for label in labels:
        query = 'after:{}'.format(latest_date)
        results = service.users().messages().list(userId='me', labelIds=[label], q=query, maxResults=500).execute()
        if 'messages' in results:
            emails.extend(results['messages'])
        while 'nextPageToken' in results:
            page_token = results['nextPageToken']
            results = service.users().messages().list(userId='me', labelIds=[label], q=query, pageToken=page_token, maxResults=500).execute()
            if 'messages' in results:
                emails.extend(results['messages'])
    return emails

def get_email_details(service, emails, links_df):
    new_links = []
    for email in emails:
        msg = service.users().messages().get(userId='me', id=email['id']).execute()
        payload = msg['payload']
        headers = payload['headers']
        for header in headers:
            if header['name'] == 'Subject':
                subject = header['value']
            if header['name'] == 'From':
                sender = header['value']
            if header['name'] == 'Date':
                date = header['value']
        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    message_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        else:
            message_body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        
        link = message_body.strip().replace('Thanks,\r\nShubham', '')
        if link not in links_df['link'].values:
            print(link)
            new_links.append({'subject': subject, 'date': date, 'link': link})
            subject = ""

        # Check if the current email date is equal to or earlier than the latest date
        if datetime.strptime(date, '%a, %d %b %Y %H:%M:%S %z') < datetime.strptime(links_df['date'].max(), '%a, %d %b %Y %H:%M:%S %z'):
            break

    if new_links:
        new_links_df = pd.DataFrame(new_links)
        links_df = pd.concat([links_df, new_links_df], ignore_index=True)
        links_df.to_json('/Users/sksq96/Documents/github/links/client/public/links.jsonl', orient='records', lines=True)

    return links_df

def main():
    creds = get_credentials()
    service = build('gmail', 'v1', credentials=creds)

    if os.path.exists('/Users/sksq96/Documents/github/links/client/public/links.jsonl'):
        links_df = pd.read_json('/Users/sksq96/Documents/github/links/client/public/links.jsonl', lines=True)
        latest_date = links_df['date'].max()
    else:
        links_df = pd.DataFrame(columns=['subject', 'date', 'link'])
        latest_date = '1970/01/01'

    labels = ['INBOX']  # Add more labels if needed
    emails = get_emails(service, labels, latest_date)
    print(len(emails)
    links_df = get_email_details(service, emails, links_df)

if __name__ == '__main__':
    main()

