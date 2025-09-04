# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Site Architecture

This is a Jekyll-based GitHub Pages personal website focused on neural networks, evolution, and consciousness research. The site features a modern tile-based home page design showcasing articles and projects. the home page should've square tiles with wrapping headers that shows the description on the other side when clicked or tapped, the tile should invert and show the other side 

### Key Components

- **Jekyll Static Site Generator**: Uses GitHub Pages with Jekyll for automatic deployment
- **Custom Theme**: No external theme dependency (`theme: null` in `_config.yml`)
- **MathJax Integration**: Mathematical notation support built into the default layout
- **Responsive Tile Layout**: Custom CSS grid system for article presentation

## Development Commands

### Local Development
```bash
# Install dependencies
bundle install

# Serve locally with live reload
bundle exec jekyll serve

# Build site for production
bundle exec jekyll build

# Clean build artifacts
bundle exec jekyll clean
```

### Site Structure
- `index.md` - Home page with tile-based article layout
- `_layouts/default.html` - Main page template with MathJax support
- `assets/css/main.css` - Custom CSS with gradient backgrounds and tile system
- `_posts/` - Blog posts following Jekyll naming convention
- `topologicalnn.md` - Featured research article on neural networks
- `_config.yml` - Jekyll configuration

## Content Management

### Adding New Articles
1. **Blog Posts**: Create in `_posts/` with format `YYYY-MM-DD-title.md`
2. **Research Papers**: Add as standalone `.md` files in root
3. **Update Home Page**: Add corresponding tile in `index.md` articles-grid section

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

### CSS Organization
- Modern CSS Grid layout for responsive tiles
- CSS custom properties for consistent theming
- Gradient backgrounds (`#667eea` to `#764ba2`)
- Hover animations and transitions
- Mobile-first responsive design

### Key CSS Classes
- `.hero` - Header section with gradient background
- `.articles-grid` - Responsive grid container
- `.article-tile` - Individual article cards
- `.article-meta` - Date and read-more footer
- `.contact-section` - Contact information styling

## Site Configuration

### _config.yml Settings
- **Title**: amazedsaint
- **URL**: https://amzsaint.github.io (note: should be updated to amazedsaint.github.io)
- **Markdown**: kramdown
- **No external theme** - fully custom styling

### MathJax Configuration
Configured for inline math with `$...$` and `\(...\)` delimiters, supporting mathematical notation in articles.

## Deployment

Site automatically deploys to GitHub Pages on push to main branch. No additional build steps required as GitHub Pages handles Jekyll compilation.