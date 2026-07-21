// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
export default function OfflineFallbackPage() {
    return (
        <html lang="en">
            <head>
                <meta charSet="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Offline – E-Learning Portal</title>
                <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .card {
            background: white;
            border-radius: 24px;
            padding: 48px 40px;
            text-align: center;
            max-width: 480px;
            width: 100%;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
          }
          .icon { font-size: 72px; margin-bottom: 24px; }
          h1 { font-size: 28px; font-weight: 800; color: #1e293b; margin-bottom: 12px; }
          p { color: #64748b; font-size: 16px; line-height: 1.6; margin-bottom: 8px; }
          .tip {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 12px;
            padding: 16px;
            margin: 24px 0;
            text-align: left;
            color: #16a34a;
            font-size: 14px;
          }
          .btn {
            background: #4f46e5;
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 100px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            margin-top: 8px;
            text-decoration: none;
            display: block;
          }
          .btn:hover { background: #4338ca; }
          .btn-outline {
            background: transparent;
            color: #4f46e5;
            border: 2px solid #4f46e5;
            margin-top: 12px;
          }
        `}</style>
            </head>
            <body>
                <div className="card">
                    <div className="icon">📡</div>
                    <h1>No Internet Connection</h1>
                    <p>Don&apos;t worry! You can still access your downloaded lessons and study materials.</p>
                    <div className="tip">
                        💡 <strong>Tip:</strong> Download lesson content while connected to Wi-Fi so you can study anywhere — even without internet!
                    </div>
                    <a className="btn" href="/student/offline">
                        Open Downloaded Content
                    </a>
                    <a className="btn btn-outline" href="/">
                        Try Again
                    </a>
                </div>
            </body>
        </html>
    );
}
