import os, json
import pickle
import base64
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
# remove links.jsonl if you want to start fresh
os.system('rm /Users/shubham.chandel/Documents/github/links/client/public/links.jsonl')


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

def get_email_details(service, emails):
    links = set()
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
        
        print(subject)
        # print(payload)
        try:        
            if 'parts' in payload:
                for part in payload['parts']:
                    if part['mimeType'] == 'text/plain':
                        message_body = base64.urlsafe_b64decode(part['body']['data']).decode('utf-8')
                        break
            else:
                message_body = base64.urlsafe_b64decode(payload['body']['data']).decode('utf-8')
        except:
            message_body = ""
            print(f"SKIPPING: {subject}")
        
        with open('/Users/shubham.chandel/Documents/github/links/client/public/links.jsonl', 'a') as f:
            link = message_body.strip().replace('Thanks,\r\nShubham', '')
            link = link.split("\n")[0].strip()
            link = link.replace("<", "").replace(">", "")
            if link in links:
                continue
            links.add(link)
            print(link)
            f.write(json.dumps({'subject': subject, 'date': date, 'link': link}) + '\n')
            subject = ""


def main():
    creds = get_credentials()
    service = build('gmail', 'v1', credentials=creds)

    labels = ['INBOX']  # Add more labels if needed
    emails = get_emails(service, labels)
    get_email_details(service, emails)

if __name__ == '__main__':
    main()
