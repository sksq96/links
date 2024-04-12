import os, json
import pickle
import base64
import pandas as pd
from datetime import datetime
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
# remove links.jsonl if you want to start fresh
JSONL = '/Users/sksq96/Documents/github/links/client/public/links.jsonl'
# os.system(f'rm {JSONL}')



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

def get_emails(service, labels):
    emails = []
    for label in labels:
        results = service.users().messages().list(userId='me', labelIds=[label], maxResults=500).execute()
        if 'messages' in results:
            emails.extend(results['messages'])
        while 'nextPageToken' in results:
            page_token = results['nextPageToken']
            results = service.users().messages().list(userId='me', labelIds=[label], pageToken=page_token, maxResults=500).execute()
            if 'messages' in results:
                emails.extend(results['messages'])
    return emails

def get_email_details(service, emails, latest_date=None, subject=""):
    results = []
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
                date_str = header['value']
                date = pd.to_datetime(date_str)

        if latest_date is not None and date < latest_date:
            break


        if 'parts' in payload:
            for part in payload['parts']:
                if part['mimeType'] == 'text/plain':
                    message_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
        else:
            message_body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        
        # with open('/Users/sksq96/Documents/github/links/client/public/links.jsonl', 'a') as f:
        link = message_body.strip().replace('Thanks,\r\nShubham', '')
        results.append({'subject': subject, 'date': date_str, 'link': link})
        print(date_str, link)
        subject = ""
    
    return results



def main():
    creds = get_credentials()
    service = build('gmail', 'v1', credentials=creds)

    df = pd.read_json(JSONL, lines=True)
    links = set(df['link'].values)
    df['date'] = pd.to_datetime(df['date'])
    latest_date = df['date'].max()
    print('Latest date:', latest_date)

    emails = get_emails(service, labels=['INBOX'])
    results = get_email_details(service, emails, latest_date=latest_date)

    # cat df and results
    df_new = pd.cat(df, results)
    df_new.sort_values('date', inplace=True).reset_index(drop=True)
    df_new.to_json(JSONL, orient='records', lines=True)

    

if __name__ == '__main__':
    main()

