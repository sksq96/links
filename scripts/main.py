import os, json
import pickle
import base64
from google.auth.transport.requests import Request
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']
# remove links.jsonl if you want to start fresh
os.system('rm ./links.jsonl')


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
        
        if "intended for a specific individual and purpose" in message_body:
            pass

        with open('./links.jsonl', 'a') as f:
            link = message_body.strip()\
                .replace('Thanks,\r\nShubham', '')\
                .replace("Thanks and regards,\r\nShubham Chandel", "")\
                .replace("Thanks and Regards,\r\n\r\nShubham Chandel\r\nNew York University", "")\
                .replace("-- \r\nThis message (including any attachments) contains confidential information \r\nintended for a specific individual and purpose, and is protected by law. If \r\nyou are not the intended recipient, you should delete this message and are \r\nhereby notified that any disclosure, copying, or distribution of this \r\nmessage, or the taking of any action based on it, is strictly prohibited.", "")\
                .replace("<", "").replace(">", "").replace("\r\n", "")
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
