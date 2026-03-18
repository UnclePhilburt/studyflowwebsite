# StudyFlowSuite Website

Official marketing and documentation website for StudyFlowSuite - AI-Powered Quiz Assistant.

## 🚀 Features

- **Landing Page** - Hero section, features, pricing, download CTA
- **Documentation** - Comprehensive guides for all features
- **Responsive Design** - Mobile-friendly and tablet-optimized
- **Modern UI** - Glassmorphism effects, smooth animations
- **SEO Optimized** - Meta tags, semantic HTML

## 📁 File Structure

```
studyflowsuitewebsite/
├── index.html          # Main landing page
├── docs.html           # Documentation page
├── styles.css          # Global styles
├── docs.css            # Documentation-specific styles
├── script.js           # Main JavaScript
├── docs.js             # Documentation JavaScript
├── assets/             # Images, icons, logos
│   ├── logo.svg
│   ├── icon.png
│   └── screenshot.png
└── README.md
```

## 🎨 Design System

### Colors
- Primary: `#667eea` (Purple)
- Secondary: `#764ba2` (Dark Purple)
- Accent: `#00e676` (Green)
- Dark: `#1a1a2e`

### Typography
- Font Family: Inter
- Headings: 800 weight
- Body: 400-500 weight

### Components
- Buttons (Primary, Secondary, Large)
- Feature Cards
- Pricing Cards
- Browser Mockup
- Extension Preview
- FAQ Accordion

## 🖼️ Required Assets

Place these files in the `assets/` folder:

1. **logo.svg** - Main logo (40x40px recommended)
2. **icon.png** - Extension icon (128x128px)
3. **screenshot.png** - Product screenshot for hero section

You can create placeholder images or use the actual extension assets.

## 🌐 Deployment

### GitHub Pages
1. Push to GitHub repository
2. Enable GitHub Pages in Settings
3. Select main branch

### Netlify
1. Connect GitHub repository
2. Build command: (none)
3. Publish directory: `/`

### Vercel
```bash
vercel --prod
```

### Custom Server
Upload all files to your web server via FTP/SFTP.

## 📝 Customization

### Update Content
- Edit text in `index.html` and `docs.html`
- Modify pricing in the pricing section
- Update stats in hero section

### Change Colors
- Edit CSS variables in `styles.css` `:root` section
- Update gradient colors throughout

### Add Pages
- Create new HTML file
- Link from navigation in `index.html`
- Follow existing structure and styling

## 🔧 Development

No build process required! Just open `index.html` in a browser.

For live reloading during development, use:
```bash
npx serve
```

Then visit `http://localhost:3000`

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## ✨ Features Implemented

- [x] Hero section with CTA
- [x] Features grid
- [x] How It Works timeline
- [x] Pricing table
- [x] Download section
- [x] FAQ accordion
- [x] Footer with links
- [x] Documentation sidebar
- [x] Code syntax highlighting
- [x] Smooth scroll navigation
- [x] Mobile responsive menu
- [x] Scroll animations
- [x] Stats counter animation

## 🚧 To Do

- [ ] Add actual product screenshots
- [ ] Create logo and icon assets
- [ ] Add blog section
- [ ] Integrate email signup form
- [ ] Add Google Analytics
- [ ] Create additional pages (About, Contact, etc.)
- [ ] Add video demo
- [ ] Implement search functionality
- [ ] Add testimonials section

## 📄 License

Copyright © 2024 StudyFlowSuite. All rights reserved.

## 🤝 Contributing

This is the official website for StudyFlowSuite. For extension development, see the main repository.
