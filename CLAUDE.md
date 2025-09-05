# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Site Architecture

This is a plain HTML static website focused on neural networks, evolution, and consciousness research. The site features a modern tile-based home page design showcasing articles and projects using pure HTML/CSS/JavaScript with GitHub Actions for automated deployment.

### Key Components

- **Static HTML Structure**: Pure HTML files with no build system dependencies
- **GitHub Actions Deployment**: Automated publishing to GitHub Pages via `.github/workflows/deploy.yml`
- **MathJax Integration**: Mathematical notation support built into all HTML templates
- **Responsive Tile Layout**: Custom CSS grid system for article presentation
- **Shared Styling**: Central `style.css` file for consistent design across all pages

## Development Commands

### Local Development
```bash
# Serve locally using any static file server
python -m http.server 8000
# or
npx serve .
# or
php -S localhost:8000
```

### Site Structure
- `index.html` - Home page with tile-based article layout
- `style.css` - Shared CSS with gradient backgrounds and responsive design
- `posts/` - Individual HTML files for each article
- `posts/index.html` - Listing page for all posts
- `.github/workflows/deploy.yml` - GitHub Actions workflow for deployment

## Content Management

### Adding New Articles
1. **Create HTML File**: Add new file in `posts/` directory (e.g., `posts/article-title.html`)
2. **Follow Template**: Use existing post structure with proper HTML head, MathJax, and CSS linking
3. **Update Home Page**: Add corresponding tile in `index.html` articles-grid section
4. **Update Posts Index**: Add tile to `posts/index.html` articles-grid section

### Article Structure Template
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Article Title - amazedsaint</title>
    <meta name="description" content="Article description">
    <link rel="stylesheet" href="../style.css">
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    <script>
        window.MathJax = {
            tex: {
                inlineMath: [['$', '$'], ['\\(', '\\)']],
                displayMath: [['$$', '$$'], ['\\[', '\\]']]
            }
        };
    </script>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1 class="site-title">amazedsaint</h1>
            <nav class="nav">
                <a href="../index.html">← Back to Home</a>
                <a href="../posts/">All Posts</a>
            </nav>
        </header>

        <article class="article-content">
            <div class="article-header">
                <span class="tile-category">Category</span>
                <h1 class="article-title">Article Title</h1>
                <div class="article-meta">Date • Category • Tags</div>
                <p class="article-description">Brief description</p>
            </div>

            <!-- Article content here -->

        </article>

        <footer class="footer">
            <p><a href="../index.html">← Back to Home</a></p>
        </footer>
    </div>
</body>
</html>
```

### Article Tiles
The home page uses a custom tile system with these classes:
- `.article-tile` - Standard article tile
- `.article-tile.featured` - Spans 2 columns, gradient background
- `.tile-category` - Category badge (Research, Project, Blog, etc.)

### Tile Categories
- **Research** - Academic papers and whitepapers
- **Project** - Open source projects and tools
- **Blog** - General posts and updates  
- **Concept/Theory/Mathematics** - Theoretical explorations
- **Applications** - Practical implementations

## Styling Architecture

### CSS Organization (style.css)
- Modern CSS Grid layout for responsive tiles
- CSS custom properties for consistent theming
- Gradient backgrounds (`#667eea` to `#764ba2`)
- Hover animations and transitions
- Mobile-first responsive design

### Key CSS Classes
- `.header` - Header section with gradient background
- `.articles-grid` - Responsive grid container
- `.article-tile` - Individual article cards
- `.tile-meta` - Date and read-more footer
- `.article-content` - Main article content container
- `.content-card` - General content card styling

## Deployment

### GitHub Actions Workflow
Site automatically deploys to GitHub Pages on push to main branch using `.github/workflows/deploy.yml`:

```yaml
name: Deploy HTML Site
on:
  push:
    branches: [ main ]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
# ... (deploys all files directly to GitHub Pages)
```

### File Publishing
- All HTML files in root and `posts/` folder are published as-is
- `style.css` provides consistent styling across all pages
- No build process required - files are served directly
- MathJax loads from CDN for mathematical notation support

## Content Workflow

### Creating New Posts
1. Create HTML file in `posts/` directory using the template above
2. Update `index.html` to add new article tile
3. Update `posts/index.html` to add new article tile
4. Commit and push - GitHub Actions will automatically deploy
5. New post will be live at `https://amazedsaint.github.io/posts/filename.html`

### Interactive Content
- Interactive JavaScript simulations can be embedded directly in HTML files
- Three.js and other libraries can be loaded via CDN
- No build system limitations on client-side code

## Simulation + Article Pattern

For posts that combine interactive simulations with research articles (like Physics Aware Flies), use this two-file pattern:

### Structure
1. **`title-simulation.html`** - Interactive simulation page (primary experience)
2. **`title-article.html`** - Research article page (detailed content)

### Simulation Page Requirements
- **Simulation first**: Large, prominent simulation area (80vh height)
- **Fullscreen support**: Must include fullscreen functionality
- **Navigation**: Clear links to article page
- **Focus**: Interactive experience over detailed explanation

### Article Page Requirements  
- **MathJax support**: Proper LaTeX rendering configuration
- **Research format**: Academic article structure with proper headings
- **Navigation**: Links back to simulation
- **Content**: Detailed mathematical/technical content

### Fullscreen Implementation
All simulations must include fullscreen capability. The fullscreen CSS is already included in `style.css`.

#### HTML Structure:
```html
<div class="simulation-container" id="simulationContainer">
  <div id="app"></div>
  <button class="fullscreen-btn" id="fullscreenBtn">⛶ Fullscreen</button>
  <!-- other simulation UI elements -->
</div>
```

#### JavaScript Implementation:
```javascript
// Fullscreen functionality
let isFullscreen = false;
function toggleFullscreen() {
  const container = document.getElementById('simulationContainer');
  const btn = document.getElementById('fullscreenBtn');
  
  if (!isFullscreen) {
    // Enter fullscreen
    container.classList.add('fullscreen');
    btn.textContent = '✕ Exit Fullscreen';
    isFullscreen = true;
    document.body.style.overflow = 'hidden';
    
    // Resize renderer if app exists (adjust for your renderer)
    if (App.renderer && App.camera) {
      setTimeout(() => {
        App.renderer.setSize(window.innerWidth, window.innerHeight);
        App.camera.aspect = window.innerWidth / window.innerHeight;
        App.camera.updateProjectionMatrix();
      }, 300);
    }
  } else {
    // Exit fullscreen  
    container.classList.remove('fullscreen');
    btn.textContent = '⛶ Fullscreen';
    isFullscreen = false;
    document.body.style.overflow = '';
    
    // Resize renderer back
    if (App.renderer && App.camera) {
      setTimeout(() => {
        const app = document.getElementById('app');
        App.renderer.setSize(app.clientWidth, app.clientHeight);
        App.camera.aspect = app.clientWidth / app.clientHeight;
        App.camera.updateProjectionMatrix();
      }, 300);
    }
  }
}

// ESC key to exit fullscreen
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isFullscreen) {
    toggleFullscreen();
  }
});

// Wire up the button
document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
```

### Navigation Links
- **Home/Posts tiles** → **Simulation page** (primary experience)
- **Simulation** ↔ **Article** (bidirectional navigation)
- **Article** should prominently link back to simulation

### MathJax Configuration for Articles
```html
<script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js"></script>
<script>
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']],
    processEscapes: true
  },
  options: {
    skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
  }
};
</script>
```

This pattern ensures:
- ✅ Simulation-first experience for interactive content
- ✅ Proper separation of concerns (interaction vs. detailed content)
- ✅ Fullscreen support for immersive experiences
- ✅ Mathematical content renders properly
- ✅ Clear navigation between simulation and theory
- remember how to create the simulation and the article if a post has simulation and the article as in Physics aware flies. also make sure simulations can be viewed in full screen with a full screen button.
- remember how to structure the article and the simulation for future articles based on what we did