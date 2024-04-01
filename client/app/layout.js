import './globals.css'

export const metadata = {
  metadataBase: new URL('http://www.rsrch.space'),
  title: 'shubham\'s internet',
  description: 'shubham\'s internet',
  openGraph: {
    type: 'website',
    url: 'https://www.shubham.lol',
    site_name: 'shubham\'s internet',
    images: [
      {
        url: '',
        alt: 'rsrch.space homepage',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@sksq96',
    title: 'shubham\'s internet',
    description: 'shubham\'s internet',
    image: ''
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <link rel="icon" href="/favicon.ico" sizes="any" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:creator" content="@ishan0102" />
      <body>
        {/* <GoogleAnalytics /> */}
        {children}
      </body>
    </html>
  )
}
