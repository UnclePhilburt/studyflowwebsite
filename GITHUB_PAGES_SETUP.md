# Enable GitHub Pages

Your website is now on GitHub! Here's how to enable GitHub Pages:

## 🚀 Enable GitHub Pages (2 minutes)

1. Go to: https://github.com/UnclePhilburt/studyflowwebsite
2. Click **"Settings"** tab (top right)
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Build and deployment"**:
   - **Source:** Deploy from a branch
   - **Branch:** main
   - **Folder:** / (root)
5. Click **"Save"**
6. Wait 2-3 minutes for deployment

## 🌐 Your Website URL

Once deployed, your site will be at:
```
https://unclephilburt.github.io/studyflowwebsite/
```

## 📝 Custom Domain (Optional)

If you want a custom domain like `studyflowsuite.com`:

1. Buy domain from Namecheap/GoDaddy
2. In GitHub Pages settings, add custom domain
3. In your domain registrar, add these DNS records:
   ```
   A Record: 185.199.108.153
   A Record: 185.199.109.153
   A Record: 185.199.110.153
   A Record: 185.199.111.153
   CNAME: unclephilburt.github.io
   ```

## ✅ Files Deployed

- ✅ index.html - Landing page
- ✅ login.html - User login
- ✅ signup.html - Account creation
- ✅ checkout.html - Stripe payment
- ✅ dashboard.html - User portal
- ✅ demo.html - Demo quizzes page
- ✅ demo-canvas-quiz.html - Canvas LMS quiz
- ✅ tutorial-sequential.html - Sequential quiz
- ✅ tutorial-onepage.html - One-page quiz
- ✅ tutorial-multipage.html - Multi-page quiz
- ✅ docs.html - Documentation
- ✅ styles.css - All styling
- ✅ script.js - Interactive features

## 🔄 Update Website

To update the website in the future:

```bash
cd "C:\Users\CodyW\OneDrive\Documents\studyflowsuitewebsite"
git add .
git commit -m "Update website"
git push
```

GitHub Pages will auto-deploy in ~2 minutes!

## 🧪 Test After Deployment

1. Visit: https://unclephilburt.github.io/studyflowwebsite/
2. Test signup flow
3. Test login
4. Try demo quizzes
5. Test payment with: 4242 4242 4242 4242

---

**Note:** The backend API is still on Render at `https://studyflowsuite.onrender.com/api`
