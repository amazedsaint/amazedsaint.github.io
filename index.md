---
layout: default
title: Home
---

<div class="section">
  <div class="section-header">
    <h2>Research & Publications</h2>
    <p class="section-subtitle">Exploring the mathematical foundations of intelligence, consciousness, and computational truth</p>
  </div>
  <div class="articles-grid">
    
    {% assign sorted_posts = site.posts | sort: 'date' | reverse %}
    {% for post in sorted_posts %}
      {% assign category_class = post.categories[0] | default: 'general' %}
      {% assign tile_class = '' %}
      {% assign category_label = post.categories[0] | capitalize %}
      
      {% if post.categories contains 'research' %}
        {% assign tile_class = 'research' %}
        {% assign category_label = 'Research Paper' %}
      {% elsif post.categories contains 'project' %}
        {% assign tile_class = 'project' %}
        {% assign category_label = 'Open Source' %}
      {% elsif post.categories contains 'blog' %}
        {% assign tile_class = 'blog' %}
        {% assign category_label = 'Blog Post' %}
      {% elsif post.categories contains 'software' %}
        {% assign tile_class = 'project' %}
        {% assign category_label = 'Software Project' %}
      {% elsif post.categories contains 'paper' %}
        {% assign tile_class = 'research' %}
        {% assign category_label = 'Research Paper' %}
      {% else %}
        {% assign tile_class = 'theory' %}
        {% assign category_label = 'Article' %}
      {% endif %}
      
      {% if post.external_link %}
        <a href="{{ post.external_link }}" class="article-tile {{ tile_class }} {% if post.featured %}featured{% endif %}" target="_blank" rel="noopener">
      {% else %}
        <a href="{{ post.url | relative_url }}" class="article-tile {{ tile_class }} {% if post.featured %}featured{% endif %}">
      {% endif %}
        <div class="tile-category">{{ category_label }}</div>
        <div class="article-content">
          <h3>{{ post.title }}</h3>
          <p>{{ post.description | default: post.excerpt | strip_html | truncate: 150 }}</p>
          <div class="article-meta">
            <span class="article-date">{{ post.date | date: "%B %Y" }}</span>
            {% if post.external_link %}
              <span class="read-more">View Project</span>
            {% else %}
              <span class="read-more">Read More</span>
            {% endif %}
          </div>
        </div>
      </a>
    {% endfor %}

  </div>
</div>

<div class="contact-section">
  <div class="contact-content">
    <h3>Academic Collaboration</h3>
    <p>Interested in collaborative research, academic discussions, or exploring these fascinating intersections of mathematics, technology, and consciousness?</p>
    <a href="mailto:amazedsaint@gmail.com" class="contact-email">amazedsaint@gmail.com</a>
  </div>
</div>