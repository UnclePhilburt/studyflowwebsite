# Local Testing Guide

## 🚫 Problem with `file://` URLs

Opening HTML files directly (double-clicking) uses `file://` protocol which:
- ❌ Blocks API requests (CORS errors)
- ❌ Can't store cookies/localStorage properly
- ❌ Browser security restrictions

## ✅ Solution: Use Local Server

### Option 1: Python Server (Easiest)

```bash
cd "C:\Users\CodyW\OneDrive\Documents\studyflowsuitewebsite"
python serve.py
```

Then open: **http://localhost:8000**

### Option 2: Python Built-in Server

```bash
cd "C:\Users\CodyW\OneDrive\Documents\studyflowsuitewebsite"
python -m http.server 8000
```

Then open: **http://localhost:8000**

### Option 3: Node.js (if you have it)

```bash
cd "C:\Users\CodyW\OneDrive\Documents\studyflowsuitewebsite"
npx http-server -p 8000
```

---

## 🧪 Test the Full Flow

1. **Start local server:**
   ```bash
   python serve.py
   ```

2. **Test Signup:**
   - Go to http://localhost:8000/signup.html
   - Create account
   - Should redirect to login

3. **Test Login:**
   - Go to http://localhost:8000/login.html
   - Login with your account
   - Should redirect to dashboard

4. **Test Payment:**
   - In dashboard, click "Upgrade to Pro"
   - Use test card: `4242 4242 4242 4242`
   - Exp: Any future date
   - CVC: Any 3 digits

5. **Test Demo Quiz:**
   - Go to http://localhost:8000/demo.html
   - Try Canvas quiz

---

## 🔧 Backend Status

Make sure your backend is deployed with CORS enabled:

```bash
cd "C:\Users\CodyW\OneDrive\Documents\StudyFlow\StudyFlowSuite"
git add .
git commit -m "Add CORS support for website"
git push
```

Wait 2-3 minutes for Render to deploy.

---

## 🌐 After GitHub Pages Deployment

Once your site is live at:
```
https://unclephilburt.github.io/studyflowwebsite/
```

The CORS is already configured to allow requests from that domain!

---

## ✅ Test Cards

```
✅ Success:           4242 4242 4242 4242
❌ Declined:          4000 0000 0000 0002
🔐 Requires 3DS:      4000 0027 6000 3184
💳 Insufficient:      4000 0000 0000 9995
```

Any future expiry date + any 3-digit CVC works!
