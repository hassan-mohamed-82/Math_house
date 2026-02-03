// ===================================
// Base Template - Clean Blue & White
// ===================================
const baseTemplate = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="
  margin: 0;
  padding: 0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #f0f5ff;
">
  <table width="100%" cellpadding="0" cellspacing="0" style="
    background-color: #f0f5ff;
    padding: 40px 20px;
  ">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="
          background-color: #ffffff;
          border-radius: 24px;
          box-shadow: 0 20px 60px rgba(37, 99, 235, 0.1);
          overflow: hidden;
          max-width: 100%;
          border: 1px solid rgba(37, 99, 235, 0.08);
        ">
          <!-- Header -->
          <tr>
            <td style="
              background: #ffffff;
              padding: 40px 30px 20px;
              text-align: center;
              border-bottom: 1px solid #e8f0fe;
            ">
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                padding: 12px 24px;
                border-radius: 50px;
                margin-bottom: 15px;
              ">
                <span style="
                  color: #ffffff;
                  font-size: 24px;
                  font-weight: 700;
                ">📚 Online Library</span>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 45px;">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="
              background-color: #f8faff;
              padding: 25px 30px;
              text-align: center;
              border-top: 1px solid #e8f0fe;
            ">
              <p style="
                color: #64748b;
                margin: 0;
                font-size: 13px;
              ">© 2025 Online Library • Made with 💙</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ===================================
// Verification Email Template (Signup)
// ===================================
export const verificationEmailTemplate = (name: string, code: string) => {
  const content = `
    <div style="text-align: center;">
      <!-- Icon Circle -->
      <div style="
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border-radius: 50%;
        margin: 0 auto 28px;
        line-height: 80px;
        border: 3px solid #3b82f6;
      ">
        <span style="font-size: 36px;">👋</span>
      </div>
      
      <!-- Welcome Text -->
      <h2 style="
        color: #1e293b;
        margin: 0 0 8px 0;
        font-size: 26px;
        font-weight: 700;
      ">Welcome, ${name}!</h2>
      
      <p style="
        color: #3b82f6;
        font-size: 15px;
        margin: 0 0 20px 0;
        font-weight: 500;
      ">Thanks for joining us ✨</p>
      
      <p style="
        color: #64748b;
        font-size: 15px;
        line-height: 1.7;
        margin: 0 0 32px 0;
      ">Enter the code below to verify your email and get started with your reading journey.</p>
      
      <!-- Code Box -->
      <div style="
        background: #ffffff;
        border: 2px solid #3b82f6;
        border-radius: 16px;
        padding: 28px;
        margin: 0 0 28px 0;
      ">
        <p style="
          color: #3b82f6;
          margin: 0 0 12px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-weight: 600;
        ">Verification Code</p>
        <div style="
          background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
          border-radius: 12px;
          padding: 20px;
        ">
          <h1 style="
            color: #ffffff;
            margin: 0;
            font-size: 42px;
            letter-spacing: 12px;
            font-weight: 700;
          ">${code}</h1>
        </div>
      </div>
      
      <!-- Timer Info -->
      <div style="
        background: #f0f5ff;
        border-radius: 12px;
        padding: 16px 20px;
        margin: 0 0 24px 0;
        display: inline-block;
      ">
        <p style="
          color: #3b82f6;
          margin: 0;
          font-size: 14px;
        ">⏱️ Code expires in <strong>2 hours</strong></p>
      </div>
      
      <!-- Divider -->
      <div style="
        height: 1px;
        background: #e2e8f0;
        margin: 0 0 20px 0;
      "></div>
      
      <!-- Footer Note -->
      <p style="
        color: #94a3b8;
        font-size: 13px;
        margin: 0;
      ">Didn't request this? You can safely ignore this email.</p>
    </div>
  `;

  return baseTemplate(content);
};

// ===================================
// Resend Verification Template
// ===================================
export const resendVerificationTemplate = (name: string, code: string) => {
  const content = `
    <div style="text-align: center;">
      <!-- Icon Circle -->
      <div style="
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
        border-radius: 50%;
        margin: 0 auto 28px;
        line-height: 80px;
        border: 3px solid #60a5fa;
      ">
        <span style="font-size: 36px;">🔄</span>
      </div>
      
      <!-- Title -->
      <h2 style="
        color: #1e293b;
        margin: 0 0 8px 0;
        font-size: 26px;
        font-weight: 700;
      ">New Code Sent!</h2>
      
      <p style="
        color: #64748b;
        font-size: 15px;
        line-height: 1.7;
        margin: 0 0 32px 0;
      ">Hey ${name}, here's your fresh verification code.</p>
      
      <!-- Code Box -->
      <div style="
        background: #ffffff;
        border: 2px solid #60a5fa;
        border-radius: 16px;
        padding: 28px;
        margin: 0 0 28px 0;
      ">
        <p style="
          color: #60a5fa;
          margin: 0 0 12px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-weight: 600;
        ">New Code</p>
        <div style="
          background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
          border-radius: 12px;
          padding: 20px;
        ">
          <h1 style="
            color: #ffffff;
            margin: 0;
            font-size: 42px;
            letter-spacing: 12px;
            font-weight: 700;
          ">${code}</h1>
        </div>
      </div>
      
      <!-- Timer Info -->
      <div style="
        background: #f0f5ff;
        border-radius: 12px;
        padding: 16px 20px;
        display: inline-block;
      ">
        <p style="
          color: #3b82f6;
          margin: 0;
          font-size: 14px;
        ">⏱️ Valid for <strong>2 hours</strong></p>
      </div>
    </div>
  `;

  return baseTemplate(content);
};

// ===================================
// Password Reset Template
// ===================================
export const passwordResetTemplate = (name: string, code: string) => {
  const content = `
    <div style="text-align: center;">
      <!-- Icon Circle -->
      <div style="
        width: 80px;
        height: 80px;
        background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
        border-radius: 50%;
        margin: 0 auto 28px;
        line-height: 80px;
        border: 3px solid #f59e0b;
      ">
        <span style="font-size: 36px;">🔑</span>
      </div>
      
      <!-- Title -->
      <h2 style="
        color: #1e293b;
        margin: 0 0 8px 0;
        font-size: 26px;
        font-weight: 700;
      ">Reset Your Password</h2>
      
      <p style="
        color: #64748b;
        font-size: 15px;
        line-height: 1.7;
        margin: 0 0 32px 0;
      ">Hey ${name}, we received a password reset request for your account.</p>
      
      <!-- Code Box -->
      <div style="
        background: #ffffff;
        border: 2px solid #f59e0b;
        border-radius: 16px;
        padding: 28px;
        margin: 0 0 28px 0;
      ">
        <p style="
          color: #f59e0b;
          margin: 0 0 12px 0;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 3px;
          font-weight: 600;
        ">Reset Code</p>
        <div style="
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
          border-radius: 12px;
          padding: 20px;
        ">
          <h1 style="
            color: #ffffff;
            margin: 0;
            font-size: 42px;
            letter-spacing: 12px;
            font-weight: 700;
          ">${code}</h1>
        </div>
      </div>
      
      <!-- Timer Info -->
      <div style="
        background: #fefce8;
        border-radius: 12px;
        padding: 16px 20px;
        margin: 0 0 20px 0;
        display: inline-block;
      ">
        <p style="
          color: #ca8a04;
          margin: 0;
          font-size: 14px;
        ">⏱️ Code expires in <strong>2 hours</strong></p>
      </div>
      
      <!-- Security Notice -->
      <div style="
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 12px;
        padding: 16px 20px;
        margin: 0;
      ">
        <p style="
          color: #dc2626;
          margin: 0;
          font-size: 13px;
        ">🛡️ Didn't request this? Ignore this email - your account is secure.</p>
      </div>
    </div>
  `;

  return baseTemplate(content);
};
